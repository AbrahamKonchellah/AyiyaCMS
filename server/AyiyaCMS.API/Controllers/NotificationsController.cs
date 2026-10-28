// AyiyaCMS.API/Controllers/NotificationsController.cs
using System.Security.Claims;
using AyiyaCMS.Infrastructure.Features.Calendar;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize(Policy = "StaffOnly")]
public class NotificationsController : ControllerBase
{
    private readonly CalendarCommand _calendar;

    public NotificationsController(CalendarCommand calendar) => _calendar = calendar;

    private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount() =>
        Ok(new { count = await _calendar.GetUnreadCountAsync(UserId) });

    [HttpGet]
    public async Task<IActionResult> GetNotifications() =>
        Ok(await _calendar.GetNotificationsAsync(UserId));

    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        await _calendar.MarkReadAsync(id, UserId);
        return Ok();
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await _calendar.MarkAllReadAsync(UserId);
        return Ok();
    }
}