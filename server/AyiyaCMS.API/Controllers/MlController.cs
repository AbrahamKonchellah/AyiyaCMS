// AyiyaCMS.API/Controllers/MlController.cs
using System.Security.Claims;
using AyiyaCMS.Infrastructure.Features.Documents;
using AyiyaCMS.Infrastructure.Services;
using AyiyaCMS.Infrastructure.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/ml")]
[Authorize(Policy = "StaffOnly")]
public class MlController : ControllerBase
{
    private const int MaxTextChars = 60_000;

    private readonly MlClient _ml;
    private readonly DocumentCommand _documents;
    private readonly S3StorageService _storage;
    private readonly MatterAccessService _matterAccess;
    private readonly AuditService _audit;

    public MlController(
        MlClient ml,
        DocumentCommand documents,
        S3StorageService storage,
        MatterAccessService matterAccess,
        AuditService audit)
    {
        _ml = ml;
        _documents = documents;
        _storage = storage;
        _matterAccess = matterAccess;
        _audit = audit;
    }

    private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string UserRole => User.FindFirst(ClaimTypes.Role)!.Value;

    public record AnalyzeTextRequest(string? Text, string? ReferenceDate);

    // ── POST /api/ml/analyze-text ─────────────────────
    [HttpPost("analyze-text")]
    public async Task<IActionResult> AnalyzeText(
        [FromBody] AnalyzeTextRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Text))
            return BadRequest(new { message = "Paste some text to analyse." });
        if (req.Text.Length > MaxTextChars)
            return BadRequest(new { message = $"Text is too long (limit {MaxTextChars:N0} characters)." });

        return await RunAsync(req.Text, ParseDate(req.ReferenceDate), ct);
    }

    // ── POST /api/ml/analyze-document/{id} ────────────
    [HttpPost("analyze-document/{id:guid}")]
    public async Task<IActionResult> AnalyzeDocument(
        Guid id, [FromQuery] string? referenceDate, CancellationToken ct)
    {
        var doc = await _documents.GetDocumentByIdAsync(id);
        if (doc == null)
            return NotFound(new { message = "Document not found." });

        // Respect the same matter-level access rules as the rest of the app
        if (doc.MatterId is Guid matterId &&
            !await _matterAccess.CanAccessMatterAsync(UserId, UserRole, matterId))
            return Forbid();

        var bytes = await _storage.DownloadAsync(doc.FileKey);
        var text = DocumentTextExtractor.Extract(bytes, doc.ContentType, doc.OriginalFileName);

        if (string.IsNullOrWhiteSpace(text))
            return UnprocessableEntity(new
            {
                message = "No readable text was found in this document. Scanned PDFs and images " +
                          "are not supported yet; use a text-based PDF or a Word file.",
            });

        await _audit.WriteAsync(
            "Document", id.ToString(), "AnalysedByModel",
            User.Identity?.Name ?? UserId.ToString(),
            $"File: {doc.OriginalFileName}");

        return await RunAsync(text, ParseDate(referenceDate), ct);
    }

    // ── GET /api/ml/health ────────────────────────────
    [HttpGet("health")]
    public async Task<IActionResult> Health(CancellationToken ct) =>
        Ok(new { online = await _ml.IsHealthyAsync(ct) });

    private static DateOnly? ParseDate(string? value) =>
        DateOnly.TryParse(value, out var d) ? d : null;

    private async Task<IActionResult> RunAsync(string text, DateOnly? reference, CancellationToken ct)
    {
        try
        {
            var result = await _ml.AnalyzeAsync(text, reference, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex) when (ex.StatusCode is null)
        {
            // No HTTP response at all: the service is not reachable
            return StatusCode(503, new
            {
                message = "The clause analysis service is not running. Start it with " +
                          "'uvicorn app:app --port 8000' in the ml-service folder.",
            });
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(502, new
            {
                message = $"The clause analysis service rejected the request ({(int)ex.StatusCode!.Value}).",
            });
        }
        catch (TaskCanceledException)
        {
            return StatusCode(504, new { message = "The clause analysis service took too long to respond." });
        }
    }
}
