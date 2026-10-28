// AyiyaCMS.API/Controllers/TimeEntriesController.cs
using System.Security.Claims;
using AyiyaCMS.Application.Features.TimeEntries.DTOs;
using AyiyaCMS.Infrastructure.Features.TimeEntries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/time-entries")]
[Authorize(Policy = "StaffOnly")]
public class TimeEntriesController : ControllerBase
{
    private readonly TimeEntryCommand _timeEntryCommand;

    public TimeEntriesController(TimeEntryCommand timeEntryCommand)
    {
        _timeEntryCommand = timeEntryCommand;
    }

    private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string UserRole => User.FindFirst(ClaimTypes.Role)!.Value;

    [HttpGet("matter/{matterId:guid}")]
    public async Task<IActionResult> GetForMatter(Guid matterId)
    {
        var entries = await _timeEntryCommand.GetEntriesForMatterAsync(matterId, UserId, UserRole);
        return Ok(entries);
    }

    [HttpPost]
    [Authorize(Policy = "LawyersOnly")]
    public async Task<IActionResult> Create([FromBody] CreateTimeEntryRequest request)
    {
        if (request.Hours <= 0)
            return BadRequest(new { message = "Hours must be greater than zero." });

        var entry = await _timeEntryCommand.CreateEntryAsync(request, UserId);
        return Ok(entry);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "LawyersOnly")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTimeEntryRequest request)
    {
        var (success, error) = await _timeEntryCommand.UpdateEntryAsync(id, request, UserId, UserRole);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Time entry updated." });
    }

    [HttpPatch("{id:guid}/billed")]
    [Authorize(Policy = "PartnerOrAdmin")]
    public async Task<IActionResult> MarkBilled(Guid id)
    {
        var success = await _timeEntryCommand.MarkBilledAsync(id);
        if (!success) return NotFound(new { message = "Time entry not found." });
        return Ok(new { message = "Time entry marked as billed." });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "LawyersOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var (success, error) = await _timeEntryCommand.DeleteEntryAsync(id, UserId, UserRole);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Time entry deleted." });
    }
}