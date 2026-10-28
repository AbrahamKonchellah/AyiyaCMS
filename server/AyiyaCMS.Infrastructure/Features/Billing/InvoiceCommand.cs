// AyiyaCMS.Infrastructure/Features/Billing/InvoiceCommand.cs
using AyiyaCMS.Application.Features.Billing.DTOs;
using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Configuration;
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Services;
using AyiyaCMS.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace AyiyaCMS.Infrastructure.Features.Billing;

public class InvoiceCommand
{
    private readonly AppDbContext _db;
    private readonly S3StorageService _storage;
    private readonly IConfiguration _config;
    private readonly FirmSettings _firm;
    private readonly AuditService _audit;

    public InvoiceCommand(
        AppDbContext db, S3StorageService storage,
        IConfiguration config, IOptions<FirmSettings> firmOptions,
        AuditService audit)
    {
        _db      = db;
        _storage = storage;
        _config  = config;
        _firm    = firmOptions.Value;
        _audit   = audit;
    }

    public async Task<List<InvoiceDto>> GetForMatterAsync(Guid matterId)
    {
        return await _db.Invoices
            .Include(i => i.Client).Include(i => i.Matter)
            .Include(i => i.FeeNote).Include(i => i.CreatedBy).Include(i => i.SentBy)
            .Where(i => i.MatterId == matterId)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => ToDto(i))
            .ToListAsync();
    }

    public async Task<List<InvoiceDto>> GetAllAsync(string? status = null)
    {
        var query = _db.Invoices
            .Include(i => i.Client).Include(i => i.Matter)
            .Include(i => i.FeeNote).Include(i => i.CreatedBy).Include(i => i.SentBy)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
            query = query.Where(i => i.Status == status);

        return await query
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => ToDto(i))
            .ToListAsync();
    }

    public async Task<(bool success, string? error, InvoiceDto? invoice)> GenerateAsync(
        GenerateInvoiceRequest request, Guid createdById)
    {
        var feeNote = await _db.FeeNotes
            .Include(f => f.Matter).ThenInclude(m => m!.Client)
            .FirstOrDefaultAsync(f => f.Id == request.FeeNoteId);

        if (feeNote == null) return (false, "Fee note not found.", null);
        if (feeNote.Status != "Approved")
            return (false, "Fee note must be approved before an invoice can be generated.", null);

        var alreadyInvoiced = await _db.Invoices.AnyAsync(i => i.FeeNoteId == feeNote.Id);
        if (alreadyInvoiced)
            return (false, "An invoice has already been generated for this fee note.", null);

        var client = feeNote.Matter?.Client;
        if (client == null) return (false, "Client not found for this matter.", null);

        var createdBy = await _db.Users.FindAsync(createdById);

        var year = DateTime.UtcNow.Year;
        var countThisYear = await _db.Invoices.CountAsync(i => i.IssuedAt.Year == year);
        var invoiceNumber = $"INV-{year}-{(countThisYear + 1):D4}";

        var pdfBytes = InvoicePdfGenerator.Generate(
            _firm, invoiceNumber, DateTime.UtcNow, request.DueDate,
            feeNote.Matter?.Title, feeNote.Matter?.JICMSCaseNumber,
            feeNote.FeeNoteNumber, client.Name, client.Address,
            feeNote.Subtotal, feeNote.VatAmount, _firm.VatRate, feeNote.TotalAmount
        );

        var fileKey    = $"matters/{feeNote.MatterId}/invoices/{invoiceNumber}.pdf";
        var bucketName = _config["AWS:BucketName"] ?? "ayiyacms";

        using (var ms = new MemoryStream(pdfBytes))
            await _storage.UploadAsync(fileKey, ms, "application/pdf");

        var invoice = new Invoice
        {
            Id            = Guid.NewGuid(),
            ClientId      = client.Id,
            MatterId      = feeNote.MatterId,
            FeeNoteId     = feeNote.Id,
            InvoiceNumber = invoiceNumber,
            Amount        = feeNote.TotalAmount,
            IssuedAt      = DateTime.UtcNow,
            DueDate       = request.DueDate,
            Status        = "Draft",
            CreatedById   = createdById,
            FileKey       = fileKey,
            BucketName    = bucketName,
            CreatedAt     = DateTime.UtcNow,
            UpdatedAt     = DateTime.UtcNow,
        };

        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("Invoice", invoice.Id.ToString(), "Generated",
            createdBy?.FullName ?? "Unknown",
            $"Number: {invoiceNumber}, Amount: KES {invoice.Amount:N2}, FeeNote: {feeNote.FeeNoteNumber}");

        var dto = await _db.Invoices
            .Include(i => i.Client).Include(i => i.Matter)
            .Include(i => i.FeeNote).Include(i => i.CreatedBy)
            .Where(i => i.Id == invoice.Id)
            .Select(i => ToDto(i))
            .FirstAsync();

        return (true, null, dto);
    }

    public async Task<bool> MarkSentAsync(Guid invoiceId, Guid sentById)
    {
        var invoice = await _db.Invoices.FindAsync(invoiceId);
        if (invoice == null || invoice.Status != "Draft") return false;

        invoice.Status    = "Sent";
        invoice.SentById  = sentById;
        invoice.SentAt    = DateTime.UtcNow;
        invoice.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var sender = await _db.Users.FindAsync(sentById);
        await _audit.WriteAsync("Invoice", invoiceId.ToString(), "Sent",
            sender?.FullName ?? "Unknown",
            $"Number: {invoice.InvoiceNumber}");

        return true;
    }

    public async Task<bool> MarkPaidAsync(Guid invoiceId, string? mpesaReceiptNumber = null)
    {
        var invoice = await _db.Invoices.FindAsync(invoiceId);
        if (invoice == null) return false;

        invoice.Status             = "Paid";
        invoice.PaidAt             = DateTime.UtcNow;
        invoice.MpesaReceiptNumber = mpesaReceiptNumber;
        invoice.UpdatedAt          = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("Invoice", invoiceId.ToString(), "Paid",
            mpesaReceiptNumber != null ? "M-Pesa Daraja" : "Manual",
            mpesaReceiptNumber != null
                ? $"Receipt: {mpesaReceiptNumber}, Number: {invoice.InvoiceNumber}"
                : $"Manual payment recorded, Number: {invoice.InvoiceNumber}");

        return true;
    }

    public async Task<int> FlagOverdueAsync()
    {
        var overdue = await _db.Invoices
            .Where(i => i.Status == "Sent" && i.DueDate < DateTime.UtcNow)
            .ToListAsync();

        foreach (var inv in overdue)
        {
            inv.Status    = "Overdue";
            inv.UpdatedAt = DateTime.UtcNow;
        }

        if (overdue.Count > 0)
            await _db.SaveChangesAsync();

        return overdue.Count;
    }

    public async Task<string?> GetFileKeyAsync(Guid id)
    {
        var invoice = await _db.Invoices.FindAsync(id);
        return invoice?.FileKey;
    }

    private static InvoiceDto ToDto(Invoice i) => new(
        i.Id, i.ClientId, i.Client?.Name ?? "Unknown",
        i.MatterId, i.Matter?.Title, i.FeeNoteId, i.FeeNote?.FeeNoteNumber,
        i.InvoiceNumber, i.Amount, i.IssuedAt, i.DueDate, i.Status,
        i.CreatedBy?.FullName ?? "Unknown", i.SentBy?.FullName,
        i.SentAt, i.PaidAt, i.MpesaReceiptNumber
    );
}