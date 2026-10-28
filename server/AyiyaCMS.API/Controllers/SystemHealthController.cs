// AyiyaCMS.API/Controllers/SystemHealthController.cs
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Features.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/system-health")]
[Authorize(Policy = "AdminOnly")]
public class SystemHealthController : ControllerBase
{
    private readonly SystemHealthCommand _health;
    private readonly AppDbContext _db;

    public SystemHealthController(SystemHealthCommand health, AppDbContext db)
    {
        _health = health;
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetHealth()
    {
        var dto = await _health.GetHealthAsync();

        // Active sessions — users with a non-expired refresh token
        var activeSessions = await _db.Users
            .CountAsync(u => u.RefreshToken != null && u.RefreshTokenExpiry > DateTime.UtcNow);

        return Ok(new
        {
            dto.DatabaseOnline,
            dto.StorageOnline,
            dto.ApiResponseMs,
            dto.StorageUsedBytes,
            ActiveSessions = activeSessions,
        });
    }
}