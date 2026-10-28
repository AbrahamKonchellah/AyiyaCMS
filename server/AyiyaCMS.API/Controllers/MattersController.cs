// AyiyaCMS.API/Controllers/MattersController.cs
using AyiyaCMS.Application.Features.Matters.DTOs;
using AyiyaCMS.Infrastructure.Features.Matters;
using AyiyaCMS.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/matters")]
[Authorize(Policy = "StaffOnly")]
public class MattersController : ControllerBase
{
    private readonly MatterCommand      _matterCommand;
    private readonly MatterAccessService _accessService;

    public MattersController(MatterCommand matterCommand, MatterAccessService accessService)
    {
        _matterCommand  = matterCommand;
        _accessService  = accessService;
    }

    private Guid   UserId      => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string UserRole    => User.FindFirst(ClaimTypes.Role)!.Value;
    private string PerformedBy => User.FindFirst(ClaimTypes.Email)?.Value
                               ?? User.FindFirst(ClaimTypes.Name)?.Value
                               ?? UserId.ToString();

    // ── GET /api/matters ──────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetMatters()
    {
        var matters = await _matterCommand.GetMattersAsync(UserId, UserRole);
        return Ok(matters);
    }

    // ── GET /api/matters/{id} ─────────────────────────
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetMatter(Guid id)
    {
        var matter = await _matterCommand.GetMatterByIdAsync(id, UserId, UserRole);
        if (matter == null)
            return NotFound(new { message = "Matter not found or access denied." });
        return Ok(matter);
    }

    // ── POST /api/matters ─────────────────────────────
    [HttpPost]
    [Authorize(Policy = "PartnerOrAdmin")]
    public async Task<IActionResult> CreateMatter([FromBody] CreateMatterRequest request)
    {
        var matter = await _matterCommand.CreateMatterAsync(request, PerformedBy);
        return CreatedAtAction(nameof(GetMatter), new { id = matter.Id }, matter);
    }

    // ── PUT /api/matters/{id} ─────────────────────────
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "PartnerOrAdmin")]
    public async Task<IActionResult> UpdateMatter(Guid id, [FromBody] UpdateMatterRequest request)
    {
        var matter = await _matterCommand.UpdateMatterAsync(id, request, PerformedBy);
        if (matter == null)
            return NotFound(new { message = "Matter not found." });
        return Ok(matter);
    }

    // ── PATCH /api/matters/{id}/assign ────────────────
    [HttpPatch("{id:guid}/assign")]
    [Authorize(Policy = "PartnerOrAdmin")]
    public async Task<IActionResult> AssignLawyer(Guid id, [FromBody] AssignLawyerRequest request)
    {
        var success = await _matterCommand.AssignLawyerAsync(id, request.LawyerId, PerformedBy);
        if (!success) return NotFound(new { message = "Matter not found." });
        return Ok(new { message = "Lawyer assigned successfully." });
    }

    // ── GET /api/matters/{id}/staff ───────────────────
    [HttpGet("{id:guid}/staff")]
    public async Task<IActionResult> GetStaff(Guid id)
    {
        var staff = await _matterCommand.GetStaffAsync(id);
        return Ok(staff);
    }

    // ── POST /api/matters/{id}/staff ──────────────────
    [HttpPost("{id:guid}/staff")]
    [Authorize(Policy = "PartnerOrAdmin")]
    public async Task<IActionResult> AddStaff(Guid id, [FromBody] AddMatterStaffRequest request)
    {
        var (success, message) = await _matterCommand.AddStaffAsync(id, request.UserId, request.Role, PerformedBy);
        if (!success) return BadRequest(new { message });
        return Ok(new { message });
    }

    // ── DELETE /api/matters/{id}/staff/{userId} ───────
    [HttpDelete("{id:guid}/staff/{userId:guid}")]
    [Authorize(Policy = "PartnerOrAdmin")]
    public async Task<IActionResult> RemoveStaff(Guid id, Guid userId)
    {
        var (success, message) = await _matterCommand.RemoveStaffAsync(id, userId, PerformedBy);
        if (!success) return NotFound(new { message });
        return Ok(new { message });
    }

    // ── PATCH /api/matters/{id}/status ────────────────
    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "PartnerOrAdmin")]
    public async Task<IActionResult> ChangeStatus(Guid id, [FromBody] ChangeStatusRequest request)
    {
        var validStatuses = new[] { "Active", "Pending", "Closed" };
        if (!validStatuses.Contains(request.Status))
            return BadRequest(new { message = "Invalid status." });

        var success = await _matterCommand.ChangeStatusAsync(id, request.Status, PerformedBy);
        if (!success) return NotFound(new { message = "Matter not found." });
        return Ok(new { message = $"Matter status changed to {request.Status}." });
    }

    // ── PATCH /api/matters/{id}/close ─────────────────
    [HttpPatch("{id:guid}/close")]
    [Authorize(Policy = "PartnerOrAdmin")]
    public async Task<IActionResult> CloseMatter(Guid id)
    {
        var success = await _matterCommand.CloseMatterAsync(id, PerformedBy);
        if (!success) return NotFound(new { message = "Matter not found." });
        return Ok(new { message = "Matter closed successfully." });
    }

    // ── DELETE /api/matters/{id} ──────────────────────
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteMatter(Guid id)
    {
        var success = await _matterCommand.DeleteMatterAsync(id, PerformedBy);
        if (!success) return NotFound(new { message = "Matter not found." });
        return Ok(new { message = "Matter deleted." });
    }

    // ── GET /api/matters/calendar ─────────────────────
    [HttpGet("calendar")]
    public async Task<IActionResult> GetCalendarEvents([FromQuery] int year, [FromQuery] int month)
    {
        var matters = await _matterCommand.GetMattersAsync(UserId, UserRole);
        var events = matters
            .SelectMany(m =>
            {
                var list = new List<object>();
                if (m.HearingDate.HasValue)
                    list.Add(new { id = m.Id, title = m.Title, clientName = m.ClientName, date = m.HearingDate.Value, type = "Hearing", matterId = m.Id });
                if (m.FilingDeadline.HasValue)
                    list.Add(new { id = $"{m.Id}-filing", title = m.Title, clientName = m.ClientName, date = m.FilingDeadline.Value, type = "Filing Deadline", matterId = m.Id });
                return list;
            })
            .Where(e => ((dynamic)e).date.Year == year && ((dynamic)e).date.Month == month)
            .ToList();

        return Ok(events);
    }
    // ── GET /api/matters/{id}/notes ───────────────────────
[HttpGet("{id:guid}/notes")]
public async Task<IActionResult> GetNotes(Guid id,
    [FromServices] MatterNoteCommand noteCommand)
{
    var notes = await noteCommand.GetNotesAsync(id, staffView: true);
    return Ok(notes);
}

// ── POST /api/matters/{id}/notes ──────────────────────
[HttpPost("{id:guid}/notes")]
public async Task<IActionResult> CreateNote(Guid id,
    [FromBody] CreateMatterNoteRequest request,
    [FromServices] MatterNoteCommand noteCommand)
{
    var note = await noteCommand.CreateNoteAsync(id, UserId, UserRole, request);
    return Ok(note);
}

// ── DELETE /api/matters/{id}/notes/{noteId} ───────────
[HttpDelete("{id:guid}/notes/{noteId:guid}")]
public async Task<IActionResult> DeleteNote(Guid id, Guid noteId,
    [FromServices] MatterNoteCommand noteCommand)
{
    var success = await noteCommand.DeleteNoteAsync(noteId, UserId, UserRole);
    if (!success) return NotFound(new { message = "Note not found or access denied." });
    return Ok(new { message = "Note deleted." });
}
}