// AyiyaCMS.API/Controllers/InvoicesController.cs
using System.Security.Claims;
using AyiyaCMS.Application.Features.Billing.DTOs;
using AyiyaCMS.Infrastructure.Features.Billing;
using AyiyaCMS.Infrastructure.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/invoices")]
[Authorize(Policy = "StaffOnly")]
public class InvoicesController : ControllerBase
{
    private readonly InvoiceCommand _invoiceCommand;
    private readonly S3StorageService _storage;

    public InvoicesController(InvoiceCommand invoiceCommand, S3StorageService storage)
    {
        _invoiceCommand = invoiceCommand;
        _storage = storage;
    }

    private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    // ── GET /api/invoices/matter/{matterId} ───────────
    [HttpGet("matter/{matterId:guid}")]
    public async Task<IActionResult> GetForMatter(Guid matterId)
    {
        var invoices = await _invoiceCommand.GetForMatterAsync(matterId);
        return Ok(invoices);
    }

    // ── GET /api/invoices ──────────────────────────────
    // Firm-wide billing page — filterable by status
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status = null)
    {
        var invoices = await _invoiceCommand.GetAllAsync(status);
        return Ok(invoices);
    }

    // ── POST /api/invoices/generate ───────────────────
    // Paralegals can draft invoices per the plan
    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] GenerateInvoiceRequest request)
    {
        var (success, error, invoice) = await _invoiceCommand.GenerateAsync(request, UserId);
        if (!success) return BadRequest(new { message = error });
        return Ok(invoice);
    }

    // ── PATCH /api/invoices/{id}/send ─────────────────
    // Only Partners can mark an invoice as sent, per the plan
    [HttpPatch("{id:guid}/send")]
    [Authorize(Policy = "PartnerOrAdmin")]
    public async Task<IActionResult> MarkSent(Guid id)
    {
        var success = await _invoiceCommand.MarkSentAsync(id, UserId);
        if (!success) return BadRequest(new { message = "Invoice not found or not in Draft status." });
        return Ok(new { message = "Invoice marked as sent." });
    }

    // ── PATCH /api/invoices/{id}/mark-paid ────────────
    // Manual payment recording (M-Pesa will call MarkPaidAsync directly via callback)
    [HttpPatch("{id:guid}/mark-paid")]
    [Authorize(Policy = "PartnerOrAdmin")]
    public async Task<IActionResult> MarkPaid(Guid id)
    {
        var success = await _invoiceCommand.MarkPaidAsync(id);
        if (!success) return NotFound(new { message = "Invoice not found." });
        return Ok(new { message = "Invoice marked as paid." });
    }

    // ── GET /api/invoices/{id}/download ───────────────
    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var fileKey = await _invoiceCommand.GetFileKeyAsync(id);
        if (fileKey == null) return NotFound();
        var url = await _storage.GetPresignedUrlAsync(fileKey, 15);
        return Ok(new { url });
    }
}