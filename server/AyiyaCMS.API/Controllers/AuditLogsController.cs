// AyiyaCMS.API/Controllers/AuditLogsController.cs
using AyiyaCMS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Policy = "AuditorOrAdmin")]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _db;
    public AuditLogsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetLogs(
        [FromQuery] string? user,
        [FromQuery] string? action,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _db.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(user))
            query = query.Where(a => a.PerformedBy.Contains(user));
        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(a => a.Action == action);
        if (from.HasValue)
            query = query.Where(a => a.PerformedAt >= from.Value.ToUniversalTime());
        if (to.HasValue)
            query = query.Where(a => a.PerformedAt <= to.Value.ToUniversalTime().AddDays(1));

        var total = await query.CountAsync();
        var logs  = await query
            .OrderByDescending(a => a.PerformedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new { a.Id, a.PerformedBy, a.Action, a.EntityName, a.EntityId, a.Changes, a.PerformedAt })
            .ToListAsync();

        return Ok(new { total, page, pageSize, logs });
    }

    [HttpGet("actions")]
    public async Task<IActionResult> GetDistinctActions()
    {
        var actions = await _db.AuditLogs.Select(a => a.Action).Distinct().OrderBy(a => a).ToListAsync();
        return Ok(actions);
    }
}