// AyiyaCMS.Infrastructure/Features/TimeEntries/TimeEntryCommand.cs
using AyiyaCMS.Application.Features.TimeEntries.DTOs;
using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Infrastructure.Features.TimeEntries;

public class TimeEntryCommand
{
    private readonly AppDbContext _db;

    public TimeEntryCommand(AppDbContext db) => _db = db;

    // ── Get entries for a matter, role-scoped ─────────
    // Partners/Admins see every entry on the matter.
    // Associates/Paralegals see only entries THEY logged —
    // ownership-based, not matter-access-based, per Step 32's wording.
    public async Task<List<TimeEntryDto>> GetEntriesForMatterAsync(Guid matterId, Guid userId, string userRole)
    {
        var query = _db.TimeEntries
            .Include(t => t.User)
            .Include(t => t.Matter)
            .Where(t => t.MatterId == matterId);

        if (userRole == "Associate" || userRole == "Paralegal")
            query = query.Where(t => t.UserId == userId);

        return await query
            .OrderByDescending(t => t.EntryDate)
            .Select(t => ToDto(t))
            .ToListAsync();
    }

    // ── Create a new entry ─────────────────────────────
    public async Task<TimeEntryDto> CreateEntryAsync(CreateTimeEntryRequest request, Guid userId)
    {
        var entry = new TimeEntry
        {
            Id          = Guid.NewGuid(),
            MatterId    = request.MatterId,
            UserId      = userId,
            Description = request.Description,
            Hours       = request.Hours,
            Rate        = request.Rate,
            EntryDate   = DateTime.SpecifyKind(request.EntryDate, DateTimeKind.Utc),
            IsBilled    = false,
            CreatedAt   = DateTime.UtcNow,
        };

        _db.TimeEntries.Add(entry);
        await _db.SaveChangesAsync();

        return await GetByIdAsync(entry.Id) ?? ToDto(entry);
    }

    // ── Update — only while unbilled ───────────────────
    public async Task<(bool success, string? error)> UpdateEntryAsync(
        Guid id, UpdateTimeEntryRequest request, Guid userId, string userRole)
    {
        var entry = await _db.TimeEntries.FindAsync(id);
        if (entry == null) return (false, "Time entry not found.");
        if (entry.IsBilled) return (false, "Billed entries can't be edited.");

        var isOwner = entry.UserId == userId;
        var isManager = userRole == "Admin" || userRole == "Partner";
        if (!isOwner && !isManager) return (false, "You can only edit your own time entries.");

        entry.Description = request.Description;
        entry.Hours        = request.Hours;
        entry.Rate         = request.Rate;
        entry.EntryDate    = DateTime.SpecifyKind(request.EntryDate, DateTimeKind.Utc);

        await _db.SaveChangesAsync();
        return (true, null);
    }

    // ── Mark as billed ──────────────────────────────────
    public async Task<bool> MarkBilledAsync(Guid id)
    {
        var entry = await _db.TimeEntries.FindAsync(id);
        if (entry == null) return false;

        entry.IsBilled = true;
        await _db.SaveChangesAsync();
        return true;
    }

    // ── Delete — only while unbilled ────────────────────
    public async Task<(bool success, string? error)> DeleteEntryAsync(Guid id, Guid userId, string userRole)
    {
        var entry = await _db.TimeEntries.FindAsync(id);
        if (entry == null) return (false, "Time entry not found.");
        if (entry.IsBilled) return (false, "Billed entries can't be deleted.");

        var isOwner = entry.UserId == userId;
        var isManager = userRole == "Admin" || userRole == "Partner";
        if (!isOwner && !isManager) return (false, "You can only delete your own time entries.");

        _db.TimeEntries.Remove(entry);
        await _db.SaveChangesAsync();
        return (true, null);
    }

    // ── Helper ────────────────────────────────────────
    private async Task<TimeEntryDto?> GetByIdAsync(Guid id)
    {
        var entry = await _db.TimeEntries
            .Include(t => t.User)
            .Include(t => t.Matter)
            .FirstOrDefaultAsync(t => t.Id == id);
        return entry == null ? null : ToDto(entry);
    }

    private static TimeEntryDto ToDto(TimeEntry t) => new(
        t.Id, t.MatterId, t.Matter?.Title ?? "Unknown",
        t.UserId, t.User?.FullName ?? "Unknown",
        t.Description, t.Hours, t.Rate, t.Hours * t.Rate,
        t.IsBilled, t.EntryDate, t.CreatedAt
    );
}