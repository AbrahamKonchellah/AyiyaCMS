// AyiyaCMS.API/Controllers/CalendarController.cs
using System.Security.Claims;
using AyiyaCMS.Application.Features.Calendar.DTOs;
using AyiyaCMS.Infrastructure.Features.Calendar;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/calendar")]
[Authorize(Policy = "StaffOnly")]
public class CalendarController : ControllerBase
{
    private readonly CalendarCommand _calendar;

    public CalendarController(CalendarCommand calendar) => _calendar = calendar;

    private Guid UserId   => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string UserRole => User.FindFirst(ClaimTypes.Role)!.Value;

    // ── Feed ──────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetFeed([FromQuery] int year, [FromQuery] int month)
    {
        if (year == 0) year  = DateTime.UtcNow.Year;
        if (month == 0) month = DateTime.UtcNow.Month;
        return Ok(await _calendar.GetFeedAsync(UserId, UserRole, year, month));
    }

    // ── Events ────────────────────────────────────────
    [HttpPost("events")]
    public async Task<IActionResult> CreateEvent([FromBody] CreateCalendarEventRequest req)
    {
        var result = await _calendar.CreateEventAsync(req, UserId);
        return Ok(result);
    }

    [HttpPut("events/{id:guid}")]
    public async Task<IActionResult> UpdateEvent(Guid id, [FromBody] UpdateCalendarEventRequest req)
    {
        var result = await _calendar.UpdateEventAsync(id, req, UserId);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpDelete("events/{id:guid}")]
    public async Task<IActionResult> DeleteEvent(Guid id)
    {
        var success = await _calendar.DeleteEventAsync(id, UserId);
        if (!success) return NotFound();
        return Ok(new { message = "Event deleted." });
    }
    [HttpGet("events/{id:guid}")]
    public async Task<IActionResult> GetEvent(Guid id)
    {
        var result = await _calendar.GetEventByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("events/{id:guid}/reminders")]
    public async Task<IActionResult> AddReminderToEvent(Guid id, [FromBody] CreateReminderRequest req)
    {
        var result = await _calendar.AddReminderToEventAsync(id, req, UserId);
        return Ok(result);
    }

    // ── Tasks ─────────────────────────────────────────
    [HttpPost("tasks")]
    public async Task<IActionResult> CreateTask([FromBody] CreateUserTaskRequest req)
    {
        var result = await _calendar.CreateTaskAsync(req, UserId, UserRole);
        return Ok(result);
    }

    [HttpPut("tasks/{id:guid}")]
    public async Task<IActionResult> UpdateTask(Guid id, [FromBody] UpdateUserTaskRequest req)
    {
        var result = await _calendar.UpdateTaskAsync(id, req, UserId);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPatch("tasks/{id:guid}/complete")]
    public async Task<IActionResult> ToggleComplete(Guid id)
    {
        var success = await _calendar.CompleteTaskAsync(id, UserId);
        if (!success) return NotFound();
        return Ok(new { message = "Task updated." });
    }

    [HttpDelete("tasks/{id:guid}")]
    public async Task<IActionResult> DeleteTask(Guid id)
    {
        var success = await _calendar.DeleteTaskAsync(id, UserId);
        if (!success) return NotFound();
        return Ok(new { message = "Task deleted." });
    }

    [HttpPost("tasks/{id:guid}/reminders")]
    public async Task<IActionResult> AddReminderToTask(Guid id, [FromBody] CreateReminderRequest req)
    {
        var result = await _calendar.AddReminderToTaskAsync(id, req, UserId);
        return Ok(result);
    }

    // ── Reminders ─────────────────────────────────────
    [HttpDelete("reminders/{id:guid}")]
    public async Task<IActionResult> DeleteReminder(Guid id)
    {
        var success = await _calendar.DeleteReminderAsync(id, UserId);
        if (!success) return NotFound();
        return Ok(new { message = "Reminder deleted." });
    }

    // ── Matter timeline ───────────────────────────────
    [HttpGet("matter/{matterId:guid}")]
    public async Task<IActionResult> GetMatterTimeline(Guid matterId)
    {
        var items = await _calendar.GetMatterTimelineAsync(matterId, UserId);
        return Ok(items);
    }

    [HttpGet("tasks/{id:guid}")]
    public async Task<IActionResult> GetTask(Guid id)
    {
        var task = await _calendar.GetTaskByIdAsync(id);
        if (task == null) return NotFound();
        return Ok(task);
    }
}