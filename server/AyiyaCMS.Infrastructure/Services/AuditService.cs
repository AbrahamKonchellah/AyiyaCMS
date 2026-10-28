// AyiyaCMS.Infrastructure/Services/AuditService.cs
using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Data;

namespace AyiyaCMS.Infrastructure.Services;

/// <summary>
/// Append-only audit log writer. Every command that mutates data calls WriteAsync.
/// The audit log table has no update or delete endpoint — this is intentional and
/// required by the Kenya Data Protection Act.
/// </summary>
public class AuditService
{
    private readonly AppDbContext _db;

    public AuditService(AppDbContext db) => _db = db;

    public virtual async Task WriteAsync(
        string entityName,
        string entityId,
        string action,
        string performedBy,
        string? changes = null)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            Id          = Guid.NewGuid(),
            EntityName  = entityName,
            EntityId    = entityId,
            Action      = action,
            PerformedBy = performedBy,
            Changes     = changes ?? string.Empty,
            PerformedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();
    }
}