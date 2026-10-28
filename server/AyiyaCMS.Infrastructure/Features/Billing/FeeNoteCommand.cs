// AyiyaCMS.Infrastructure/Features/Billing/FeeNoteCommand.cs
using AyiyaCMS.Application.Features.Billing.DTOs;
using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Configuration;
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace AyiyaCMS.Infrastructure.Features.Billing;

public class FeeNoteCommand
{
    private readonly AppDbContext _db;
    private readonly S3StorageService _storage;
    private readonly IConfiguration _config;
    private readonly FirmSettings _firm;

    public FeeNoteCommand(AppDbContext db, S3StorageService storage, IConfiguration config, IOptions<FirmSettings> firmOptions)
    {
        _db = db;
        _storage = storage;
        _config = config;
        _firm = firmOptions.Value;
    }

    public async Task<List<FeeNoteDto>> GetForMatterAsync(Guid matterId)
    {
        return await _db.FeeNotes
            .Include(f => f.GeneratedBy)
            .Include(f => f.ApprovedBy)
            .Include(f => f.Matter)
            .Where(f => f.MatterId == matterId)
            .OrderByDescending(f => f.GeneratedAt)
            .Select(f => ToDto(f))
            .ToListAsync();
    }

    public async Task<(bool success, string? error, FeeNoteDto? feeNote)> GenerateAsync(Guid matterId, Guid generatedById)
    {
        var matter = await _db.Matters.Include(m => m.Client).FirstOrDefaultAsync(m => m.Id == matterId);
        if (matter == null) return (false, "Matter not found.", null);

        var unbilled = await _db.TimeEntries
            .Where(t => t.MatterId == matterId && !t.IsBilled)
            .OrderBy(t => t.EntryDate)
            .ToListAsync();

        if (unbilled.Count == 0)
            return (false, "No unbilled time entries on this matter.", null);

        var generatedBy = await _db.Users.FindAsync(generatedById);

        var subtotal = unbilled.Sum(t => t.Hours * t.Rate);
        var vatAmount = Math.Round(subtotal * _firm.VatRate, 2);
        var total = subtotal + vatAmount;

        var year = DateTime.UtcNow.Year;
        var countThisYear = await _db.FeeNotes.CountAsync(f => f.GeneratedAt.Year == year);
        var feeNoteNumber = $"FN-{year}-{(countThisYear + 1):D4}";

        var lineItems = unbilled.Select(t => new FeeNoteLineItem
        {
            Date        = t.EntryDate,
            Description = t.Description,
            Hours       = t.Hours,
            Rate        = t.Rate,
            Amount      = t.Hours * t.Rate,
        }).ToList();

        var pdfBytes = FeeNotePdfGenerator.Generate(
            _firm, feeNoteNumber, DateTime.UtcNow,
            matter.Title, matter.JICMSCaseNumber,
            matter.Client?.Name ?? "Unknown Client", matter.Client?.Address,
            lineItems, subtotal, vatAmount, total, _firm.VatRate,
            generatedBy?.FullName ?? "Unknown"
        );

        var fileKey = $"matters/{matterId}/fee-notes/{feeNoteNumber}.pdf";
        var bucketName = _config["AWS:BucketName"] ?? "ayiyacms";

        using (var ms = new MemoryStream(pdfBytes))
            await _storage.UploadAsync(fileKey, ms, "application/pdf");

        var feeNote = new FeeNote
        {
            Id            = Guid.NewGuid(),
            MatterId      = matterId,
            FeeNoteNumber = feeNoteNumber,
            Subtotal      = subtotal,
            VatAmount     = vatAmount,
            TotalAmount   = total,
            Status        = "PendingApproval",
            GeneratedById = generatedById,
            FileKey       = fileKey,
            BucketName    = bucketName,
            GeneratedAt   = DateTime.UtcNow,
        };

        _db.FeeNotes.Add(feeNote);

        foreach (var entry in unbilled)
        {
            entry.IsBilled  = true;
            entry.FeeNoteId = feeNote.Id;
        }

        await _db.SaveChangesAsync();

        var dto = await _db.FeeNotes
            .Include(f => f.GeneratedBy).Include(f => f.Matter)
            .Where(f => f.Id == feeNote.Id)
            .Select(f => ToDto(f))
            .FirstAsync();

        return (true, null, dto);
    }

    public async Task<bool> ApproveAsync(Guid feeNoteId, Guid approvedById)
    {
        var feeNote = await _db.FeeNotes.FindAsync(feeNoteId);
        if (feeNote == null || feeNote.Status == "Approved") return false;

        feeNote.Status      = "Approved";
        feeNote.ApprovedById = approvedById;
        feeNote.ApprovedAt   = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<string?> GetFileKeyAsync(Guid id)
    {
        var feeNote = await _db.FeeNotes.FindAsync(id);
        return feeNote?.FileKey;
    }

    private static FeeNoteDto ToDto(FeeNote f) => new(
        f.Id, f.MatterId, f.Matter?.Title ?? "Unknown", f.FeeNoteNumber,
        f.Subtotal, f.VatAmount, f.TotalAmount, f.Status,
        f.GeneratedBy?.FullName ?? "Unknown",
        f.ApprovedBy?.FullName,
        f.ApprovedAt, f.GeneratedAt
    );
}