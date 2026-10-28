// AyiyaCMS.API/Controllers/AdminDashboardController.cs
using AyiyaCMS.Infrastructure.Features.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AyiyaCMS.Infrastructure.Services;
using Microsoft.Extensions.Hosting;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/admin-dashboard")]
[Authorize(Policy = "AdminOnly")]
public class AdminDashboardController : ControllerBase
{
    private readonly AdminDashboardCommand _adminDashboard;
    private readonly SystemHealthCommand _systemHealth;

    public AdminDashboardController(AdminDashboardCommand adminDashboard, SystemHealthCommand systemHealth)
    {
        _adminDashboard = adminDashboard;
        _systemHealth = systemHealth;
    }

    // ── GET /api/admin/dashboard/stats ────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _adminDashboard.GetStatsAsync();
        return Ok(stats);
    }

    // ── GET /api/admin/dashboard/audit-log ────────────
    [HttpGet("audit-log")]
    public async Task<IActionResult> GetAuditLog([FromQuery] int page = 1, [FromQuery] int pageSize = 30)
    {
        var logs = await _adminDashboard.GetAuditLogAsync(page, pageSize);
        return Ok(logs);
    }
// ── GET /api/admin-dashboard/health ──────────────
[HttpGet("health")]
public async Task<IActionResult> GetHealth()
{
    var health = await _systemHealth.GetHealthAsync();
    return Ok(health);
}
// ── POST /api/admin-dashboard/reminders/run ───────
[HttpPost("reminders/run")]
public async Task<IActionResult> TriggerReminders()
{
    var job = HttpContext.RequestServices
        .GetServices<IHostedService>()
        .OfType<DeadlineReminderJob>()
        .FirstOrDefault();

    if (job == null)
        return StatusCode(500, new { message = "Reminder job not registered." });

    await job.RunAsync();
    return Ok(new { message = "Reminder job completed." });
}
}