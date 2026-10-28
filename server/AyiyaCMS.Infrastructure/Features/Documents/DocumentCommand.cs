// AyiyaCMS.Infrastructure/Features/Documents/DocumentCommand.cs
using AyiyaCMS.Application.Features.Documents.DTOs;
using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Infrastructure.Features.Documents;

public class DocumentCommand
{
    private readonly AppDbContext _db;
    private readonly MatterAccessService _matterAccess;
    private readonly AuditService _audit;

    public DocumentCommand(AppDbContext db, MatterAccessService matterAccess, AuditService audit)
    {
        _db           = db;
        _matterAccess = matterAccess;
        _audit        = audit;
    }

    public async Task<List<DocumentDto>> GetDocumentsForMatterAsync(Guid matterId)
    {
        return await _db.Documents
            .Include(d => d.UploadedBy)
            .Include(d => d.Matter)
            .Where(d => d.MatterId == matterId)
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => ToDto(d))
            .ToListAsync();
    }

    public async Task<List<DocumentDto>> GetVersionHistoryAsync(Guid matterId, string originalFileName)
    {
        return await _db.Documents
            .Include(d => d.UploadedBy)
            .Where(d => d.MatterId == matterId && d.OriginalFileName == originalFileName)
            .OrderByDescending(d => d.Version)
            .Select(d => ToDto(d))
            .ToListAsync();
    }

    public async Task<DocumentDto> SaveDocumentAsync(
        UploadDocumentRequest request, Guid uploadedById, string uploadedByName)
    {
        var existingVersion = await _db.Documents
            .Where(d => d.MatterId == request.MatterId && d.OriginalFileName == request.FileName)
            .MaxAsync(d => (int?)d.Version) ?? 0;

        var document = new Document
        {
            Id               = Guid.NewGuid(),
            OriginalFileName = request.FileName,
            FileName         = request.FileKey.Split('/').Last(),
            FileKey          = request.FileKey,
            BucketName       = request.BucketName,
            ContentType      = request.ContentType,
            FileSizeBytes    = request.FileSizeBytes,
            Checksum         = request.Checksum,
            Version          = existingVersion + 1,
            MatterId         = request.MatterId,
            UploadedById     = uploadedById,
            UploadedAt       = DateTime.UtcNow,
        };

        _db.Documents.Add(document);
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("Document", document.Id.ToString(), "Uploaded",
            uploadedByName,
            $"File: {document.OriginalFileName}, Matter: {document.MatterId}, Version: {document.Version}");

        return await GetDocumentByIdAsync(document.Id) ?? ToDto(document);
    }

    public async Task<DocumentDto?> GetDocumentByIdAsync(Guid id)
    {
        var doc = await _db.Documents
            .Include(d => d.UploadedBy)
            .Include(d => d.Matter)
                .ThenInclude(m => m!.Client)
            .FirstOrDefaultAsync(d => d.Id == id);
        return doc == null ? null : ToDto(doc);
    }

    public async Task<(bool success, string fileKey)> DeleteDocumentAsync(Guid id, string deletedByName)
    {
        var doc = await _db.Documents.FindAsync(id);
        if (doc == null) return (false, string.Empty);

        var fileKey  = doc.FileKey;
        var fileName = doc.OriginalFileName;
        _db.Documents.Remove(doc);
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("Document", id.ToString(), "Deleted",
            deletedByName, $"File: {fileName}");

        return (true, fileKey);
    }

    public async Task<List<DocumentDto>> GetAllAccessibleDocumentsAsync(Guid userId, string userRole)
    {
        var matterIds = await _matterAccess.GetAccessibleMatterIdsAsync(userId, userRole);

        var allDocs = await _db.Documents
            .Include(d => d.UploadedBy)
            .Include(d => d.Matter)
            .Where(d => d.MatterId != null && matterIds.Contains(d.MatterId.Value))
            .ToListAsync();

        return allDocs
            .GroupBy(d => (d.MatterId, d.OriginalFileName))
            .Select(g => g.OrderByDescending(d => d.Version).First())
            .OrderByDescending(d => d.UploadedAt)
            .Select(ToDto)
            .ToList();
    }

    private static DocumentDto ToDto(Document d) => new(
        d.Id, d.OriginalFileName, d.FileKey, d.ContentType, d.FileSizeBytes,
        d.Checksum, d.Version, d.MatterId, d.Matter?.Title, d.Matter?.Client?.Name,
        d.UploadedById, d.UploadedBy != null ? d.UploadedBy.FullName : "Unknown",
        d.UploadedAt
    );
}