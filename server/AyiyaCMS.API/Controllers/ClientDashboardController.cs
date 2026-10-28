// AyiyaCMS.API/Controllers/ClientDashboardController.cs
using AyiyaCMS.Infrastructure.Features.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using AyiyaCMS.Application.Features.Matters.DTOs;
using AyiyaCMS.Infrastructure.Features.Matters;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/client-dashboard")]
[Authorize(Policy = "ClientOnly")]
public class ClientDashboardController : ControllerBase
{
    private readonly ClientDashboardCommand _clientDashboard;

    public ClientDashboardController(ClientDashboardCommand clientDashboard)
    {
        _clientDashboard = clientDashboard;
    }

    private Guid UserId => Guid.Parse(
        User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ── GET /api/client-dashboard/stats ───────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _clientDashboard.GetStatsAsync(UserId);
        if (stats == null)
            return NotFound(new { message = "No client record linked to this account." });
        return Ok(stats);
    }

    // ── GET /api/client-dashboard/matters ─────────────
    [HttpGet("matters")]
    public async Task<IActionResult> GetMatters()
    {
        var matters = await _clientDashboard.GetMattersAsync(UserId);
        return Ok(matters);
    }

    // ── GET /api/client-dashboard/invoices ────────────
    [HttpGet("invoices")]
    public async Task<IActionResult> GetInvoices()
    {
        var invoices = await _clientDashboard.GetInvoicesAsync(UserId);
        return Ok(invoices);
    }

    // ── GET /api/client-dashboard/all-matters ─────────
    [HttpGet("all-matters")]
    public async Task<IActionResult> GetAllMatters()
    {
        var matters = await _clientDashboard.GetAllMattersAsync(UserId);
        return Ok(matters);
    }

    // ── GET /api/client-dashboard/all-invoices ────────
    [HttpGet("all-invoices")]
    public async Task<IActionResult> GetAllInvoices(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var invoices = await _clientDashboard.GetAllInvoicesAsync(UserId, page, pageSize);
        return Ok(invoices);
    }

    // ── GET /api/client-dashboard/invoices/{id} ───────
    [HttpGet("invoices/{id:guid}")]
    public async Task<IActionResult> GetInvoice(Guid id)
    {
        var invoice = await _clientDashboard.GetInvoiceAsync(UserId, id);
        if (invoice == null) return NotFound();
        return Ok(invoice);
    }

    // ── GET /api/client-dashboard/matters/{matterId}/documents
    [HttpGet("matters/{matterId:guid}/documents")]
    public async Task<IActionResult> GetMatterDocuments(Guid matterId)
    {
        var docs = await _clientDashboard.GetMatterDocumentsAsync(UserId, matterId);
        if (docs == null)
            return NotFound(new { message = "Matter not found or not accessible." });
        return Ok(docs);
    }

    // ── GET /api/client-dashboard/documents/{id}/download
    [HttpGet("documents/{id:guid}/download")]
    public async Task<IActionResult> DownloadDocument(Guid id)
    {
        var url = await _clientDashboard.GetDocumentDownloadUrlAsync(UserId, id);
        if (url == null)
            return NotFound(new { message = "Document not found or not accessible." });
        return Ok(new { url });
    }
    // ── GET /api/client-dashboard/matters/{matterId}/notes ─
[HttpGet("matters/{matterId:guid}/notes")]
public async Task<IActionResult> GetMatterNotes(Guid matterId,
    [FromServices] MatterNoteCommand noteCommand)
{
    // Verify matter belongs to this client first
    var docs = await _clientDashboard.GetMatterDocumentsAsync(UserId, matterId);
    if (docs == null)
        return NotFound(new { message = "Matter not found or not accessible." });

    var notes = await noteCommand.GetNotesAsync(matterId, staffView: false);
    return Ok(notes);
}

// ── POST /api/client-dashboard/matters/{matterId}/notes ─
[HttpPost("matters/{matterId:guid}/notes")]
public async Task<IActionResult> CreateMatterNote(Guid matterId,
    [FromBody] CreateMatterNoteRequest request,
    [FromServices] MatterNoteCommand noteCommand)
{
    var docs = await _clientDashboard.GetMatterDocumentsAsync(UserId, matterId);
    if (docs == null)
        return NotFound(new { message = "Matter not found or not accessible." });

    var note = await noteCommand.CreateNoteAsync(matterId, UserId, "Client", request);
    return Ok(note);
}
}