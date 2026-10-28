// AyiyaCMS.API/Controllers/DocumentsController.cs
using System.Security.Claims;
using System.Security.Cryptography;
using AyiyaCMS.Application.Features.Documents.DTOs;
using AyiyaCMS.Infrastructure.Features.Documents;
using AyiyaCMS.Infrastructure.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AyiyaCMS.Infrastructure.Services;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/documents")]
[Authorize(Policy = "StaffOnly")]
public class DocumentsController : ControllerBase
{
    private readonly DocumentCommand _documentCommand;
    private readonly S3StorageService _storage;
    private readonly IConfiguration _config;
    
    private readonly MeilisearchService _meilisearch;
    private readonly MatterAccessService _matterAccess;

    public DocumentsController(
        DocumentCommand documentCommand,
        S3StorageService storage,
        IConfiguration config,
         MeilisearchService meilisearch,
         MatterAccessService matterAccess)
    {
        _documentCommand = documentCommand;
        _storage = storage;
        _config = config;
        _meilisearch = meilisearch;
        _matterAccess = matterAccess;
    }
    

    private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string UserRole => User.FindFirst(ClaimTypes.Role)!.Value;

    // ── GET /api/documents/matter/{matterId} ──────────
    [HttpGet("matter/{matterId:guid}")]
    public async Task<IActionResult> GetDocuments(Guid matterId)
    {
        var docs = await _documentCommand.GetDocumentsForMatterAsync(matterId);
        return Ok(docs);
    }
    
    // ── GET /api/documents — all documents across every matter the user can access ──
    [HttpGet]
    public async Task<IActionResult> GetAllDocuments()
    {
        var docs = await _documentCommand.GetAllAccessibleDocumentsAsync(UserId, UserRole);
        return Ok(docs);
    }

    // ── GET /api/documents/{id}/versions ─────────────
    [HttpGet("{id:guid}/versions")]
    public async Task<IActionResult> GetVersionHistory(Guid id)
    {
        var doc = await _documentCommand.GetDocumentByIdAsync(id);
        if (doc == null) return NotFound();

        var versions = await _documentCommand.GetVersionHistoryAsync(
            doc.MatterId!.Value, doc.OriginalFileName);
        return Ok(versions);
    }

    // ── POST /api/documents/upload ────────────────────
    [HttpPost("upload")]
    public async Task<IActionResult> Upload([FromForm] Guid matterId, IFormFile file)
    {
        if (file == null || file.Length == 0)
        return BadRequest(new { message = "No file provided." });
        
        if (file.Length > 52_428_800)
        return BadRequest(new { message = "File exceeds 50MB limit." });
        
        // Buffer once — reused for checksum, S3, and text extraction
        byte[] fileBytes;
        using (var ms = new MemoryStream())
        {
            await file.CopyToAsync(ms);
            fileBytes = ms.ToArray();
        }
        string checksum;
        using (var sha256 = SHA256.Create())
            checksum = Convert.ToHexString(sha256.ComputeHash(fileBytes)).ToLower();
        
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var safeFileName = Path.GetFileName(file.FileName)
            .Replace(" ", "_").Replace("#", "").Replace("&", "");
        var fileKey = $"matters/{matterId}/documents/{timestamp}_{safeFileName}";
        var bucketName = _config["AWS:BucketName"] ?? "ayiyacms";
        
        using (var uploadStream = new MemoryStream(fileBytes))
            await _storage.UploadAsync(fileKey, uploadStream, file.ContentType);
        
        var doc = await _documentCommand.SaveDocumentAsync(new UploadDocumentRequest(
            MatterId:      matterId,
            FileName:      file.FileName,
            ContentType:   file.ContentType,
            FileSizeBytes: file.Length,
            FileKey:       fileKey,
            BucketName:    bucketName,
            Checksum:      checksum,
            Version:       1
        ), UserId, User.Identity?.Name ?? string.Empty);
        
        Console.WriteLine($"[Upload] Saved doc Id={doc.Id} MatterId={doc.MatterId} ClientName={doc.ClientName}");
        // Best-effort — Meilisearch being down never blocks the upload
        try
        {
            var extractedText = DocumentTextExtractor.Extract(
                fileBytes, file.ContentType, file.FileName);
                
            await _meilisearch.IndexDocumentAsync(new DocumentSearchEntry
            {
                Id               = doc.Id.ToString(),
                OriginalFileName = doc.OriginalFileName,
                Content          = extractedText,
                MatterId         = doc.MatterId?.ToString(),
                MatterTitle      = doc.MatterTitle,
                ClientName       = doc.ClientName,
                ContentType      = doc.ContentType,
                FileSizeBytes    = doc.FileSizeBytes,
                Version          = doc.Version,
                UploadedByName   = doc.UploadedByName,
                UploadedAt       = doc.UploadedAt.ToString("o"),
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Meilisearch] Indexing failed: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
        }
        
        return Ok(doc);
    }


    // ── GET /api/documents/{id}/download ─────────────────
    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var doc = await _documentCommand.GetDocumentByIdAsync(id);
        if (doc == null) return NotFound();
        var url = await _storage.GetPresignedUrlAsync(doc.FileKey, 15);
        return Ok(new { url });
    }
    // ── DELETE /api/documents/{id} ────────────────────
    
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "PartnerOrAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var (success, fileKey) = await _documentCommand.DeleteDocumentAsync(id, User.Identity?.Name ?? string.Empty);
        if (!success) return NotFound(new { message = "Document not found." });
        
        await _storage.DeleteAsync(fileKey);
        try { await _meilisearch.DeleteDocumentAsync(id); }
        catch { }
        
        return Ok(new { message = "Document deleted." });
    }
    
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
           return Ok(new List<DocumentSearchEntry>());
        var matterIds = await _matterAccess.GetAccessibleMatterIdsAsync(UserId, UserRole);
        var results = await _meilisearch.SearchAsync(q, matterIds);
        return Ok(results);
    }

    [HttpGet("{id:guid}/content")]
    public async Task<IActionResult> GetContent(Guid id)
    {
        var doc = await _documentCommand.GetDocumentByIdAsync(id);
        if (doc == null) return NotFound();
        
        var bytes = await _storage.DownloadAsync(doc.FileKey);
        return File(bytes, doc.ContentType);
    }
}