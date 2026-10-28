// AyiyaCMS.API/Controllers/DashboardController.cs
using AyiyaCMS.Infrastructure.Features.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly DashboardCommand _dashboard;

    public DashboardController(DashboardCommand dashboard)
    {
        _dashboard = dashboard;
    }

    // ── GET /api/dashboard/stats ──────────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var (userId, role) = GetCallerContext();
        var stats = await _dashboard.GetStatsAsync(userId, role);
        return Ok(stats);
    }

    // ── GET /api/dashboard/activity ───────────────────
    [HttpGet("activity")]
    public async Task<IActionResult> GetActivity()
    {
        var (userId, role) = GetCallerContext();
        var activity = await _dashboard.GetActivityAsync(userId, role);
        return Ok(activity);
    }

    // ── GET /api/dashboard/deadlines ─────────────────
    [HttpGet("deadlines")]
    public async Task<IActionResult> GetDeadlines()
    {
        var (userId, role) = GetCallerContext();
        var deadlines = await _dashboard.GetDeadlinesAsync(userId, role);
        return Ok(deadlines);
    }

    // ── Helper ────────────────────────────────────────
    private (Guid userId, string role) GetCallerContext()
    {
        var userId = Guid.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role = User.FindFirstValue(ClaimTypes.Role) ?? "Associate";
        return (userId, role);
    }
}