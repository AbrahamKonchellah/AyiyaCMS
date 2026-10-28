// AyiyaCMS.API/Controllers/FeeNotesController.cs
using System.Security.Claims;
using AyiyaCMS.Application.Features.Billing.DTOs;
using AyiyaCMS.Infrastructure.Features.Billing;
using AyiyaCMS.Infrastructure.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/fee-notes")]
[Authorize(Policy = "StaffOnly")]
public class FeeNotesController : ControllerBase
{
    private readonly FeeNoteCommand _feeNoteCommand;
    private readonly S3StorageService _storage;

    public FeeNotesController(FeeNoteCommand feeNoteCommand, S3StorageService storage)
    {
        _feeNoteCommand = feeNoteCommand;
        _storage = storage;
    }

    private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet("matter/{matterId:guid}")]
    public async Task<IActionResult> GetForMatter(Guid matterId)
    {
        var feeNotes = await _feeNoteCommand.GetForMatterAsync(matterId);
        return Ok(feeNotes);
    }

    [HttpPost("generate")]
    [Authorize(Policy = "LawyersOnly")]
    public async Task<IActionResult> Generate([FromBody] GenerateFeeNoteRequest request)
    {
        var (success, error, feeNote) = await _feeNoteCommand.GenerateAsync(request.MatterId, UserId);
        if (!success) return BadRequest(new { message = error });
        return Ok(feeNote);
    }

    [HttpPatch("{id:guid}/approve")]
    [Authorize(Policy = "PartnerOrAdmin")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var success = await _feeNoteCommand.ApproveAsync(id, UserId);
        if (!success) return NotFound(new { message = "Fee note not found or already approved." });
        return Ok(new { message = "Fee note approved." });
    }

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var fileKey = await _feeNoteCommand.GetFileKeyAsync(id);
        if (fileKey == null) return NotFound();
        var url = await _storage.GetPresignedUrlAsync(fileKey, 15);
        return Ok(new { url });
    }
}