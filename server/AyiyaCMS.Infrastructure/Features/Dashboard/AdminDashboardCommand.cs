// AyiyaCMS.Infrastructure/Features/Dashboard/AdminDashboardCommand.cs
using AyiyaCMS.Application.Features.Dashboard.DTOs;
using AyiyaCMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace AyiyaCMS.Infrastructure.Features.Dashboard;

public class AdminDashboardCommand
{
    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;

    public AdminDashboardCommand(AppDbContext db, IMemoryCache cache)
    {
        _db    = db;
        _cache = cache;
    }

    // ── Stats ─────────────────────────────────────────
    public async Task<AdminDashboardStatsDto> GetStatsAsync()
    {
        const string cacheKey = "admin-dashboard:stats";

        if (_cache.TryGetValue(cacheKey, out AdminDashboardStatsDto? cached) && cached is not null)
            return cached;

        var totalUsers    = await _db.Users.CountAsync();
        var activeUsers   = await _db.Users.CountAsync(u => u.IsActive);
        var usersByRole   = await _db.Users
                                .GroupBy(u => u.Role)
                                .Select(g => new { Role = g.Key, Count = g.Count() })
                                .ToDictionaryAsync(g => g.Role, g => g.Count);
        var totalClients  = await _db.Clients.CountAsync();
        var activeMatters = await _db.Matters.CountAsync(m => m.Status == "Active");
        var totalDocs     = await _db.Documents.CountAsync();

        var result = new AdminDashboardStatsDto
        {
            TotalUsers     = totalUsers,
            ActiveUsers    = activeUsers,
            TotalClients   = totalClients,
            ActiveMatters  = activeMatters,
            TotalDocuments = totalDocs,
            UsersByRole    = usersByRole,
        };

        _cache.Set(cacheKey, result, TimeSpan.FromSeconds(60));
        return result;
    }

    // ── Audit log feed ────────────────────────────────
    public async Task<List<AuditLogDto>> GetAuditLogAsync(int page = 1, int pageSize = 30)
    {
        return await _db.AuditLogs
            .OrderByDescending(a => a.PerformedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto
            {
                Id          = a.Id.ToString(),
                EntityName  = a.EntityName,
                EntityId    = a.EntityId,
                Action      = a.Action,
                PerformedBy = a.PerformedBy,
                PerformedAt = a.PerformedAt,
                Changes     = a.Changes,
            })
            .ToListAsync();
    }
}