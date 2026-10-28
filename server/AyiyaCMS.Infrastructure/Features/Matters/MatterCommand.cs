// AyiyaCMS.Infrastructure/Features/Matters/MatterCommand.cs
using AyiyaCMS.Application.Features.Matters.DTOs;
using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Infrastructure.Features.Matters;

public class MatterCommand
{
    private readonly AppDbContext _db;
    private readonly AuditService _audit;

    public MatterCommand(AppDbContext db, AuditService audit)
    {
        _db    = db;
        _audit = audit;
    }

    private static DateTime? ToUtc(DateTime? dt) =>
        dt.HasValue ? DateTime.SpecifyKind(dt.Value, DateTimeKind.Utc) : null;

    // ── Helpers ───────────────────────────────────────
    // Returns true if the user is directly assigned or on the MatterStaff table
    private async Task<bool> HasMatterAccessAsync(Guid matterId, Guid userId)
    {
        var matter = await _db.Matters.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == matterId);
        if (matter == null) return false;
        if (matter.AssignedLawyerId == userId) return true;
        return await _db.MatterStaff.AnyAsync(ms => ms.MatterId == matterId && ms.UserId == userId);
    }

    // ── Matters list ──────────────────────────────────
    public async Task<List<MatterDto>> GetMattersAsync(Guid userId, string userRole)
    {
        var query = _db.Matters
            .Include(m => m.Client)
            .Include(m => m.AssignedLawyer)
            .Include(m => m.Staff)
                .ThenInclude(ms => ms.User)
            .AsQueryable();

        if (userRole == "Associate" || userRole == "Paralegal")
            query = query.Where(m =>
                m.AssignedLawyerId == userId ||
                m.Staff!.Any(ms => ms.UserId == userId));

        if (userRole == "Client")
        {
            var clientEmail = await _db.Users
                .Where(u => u.Id == userId)
                .Select(u => u.Email)
                .FirstOrDefaultAsync();
            query = query.Where(m => m.Client!.Email == clientEmail);
        }

        return await query
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => ToDto(m))
            .ToListAsync();
    }

    // ── Matter by id ──────────────────────────────────
    public async Task<MatterDto?> GetMatterByIdAsync(Guid matterId, Guid userId, string userRole)
    {
        var matter = await _db.Matters
            .Include(m => m.Client)
            .Include(m => m.AssignedLawyer)
            .Include(m => m.Staff)
                .ThenInclude(ms => ms.User)
            .FirstOrDefaultAsync(m => m.Id == matterId);

        if (matter == null) return null;

        if (userRole == "Associate" || userRole == "Paralegal")
        {
            var isAssigned = matter.AssignedLawyerId == userId
                || matter.Staff!.Any(ms => ms.UserId == userId);
            if (!isAssigned) return null;
        }

        return ToDto(matter);
    }

    // ── Create ────────────────────────────────────────
    public async Task<MatterDto> CreateMatterAsync(CreateMatterRequest request, string performedBy)
    {
        var matter = new Matter
        {
            Id               = Guid.NewGuid(),
            Title            = request.Title,
            JICMSCaseNumber  = request.JICMSCaseNumber,
            CourtStation     = request.CourtStation,
            ClientId         = request.ClientId,
            AssignedLawyerId = request.AssignedLawyerId,
            HearingDate      = ToUtc(request.HearingDate),
            FilingDeadline   = ToUtc(request.FilingDeadline),
            Status           = "Active",
            CreatedAt        = DateTime.UtcNow,
            UpdatedAt        = DateTime.UtcNow,
        };

        _db.Matters.Add(matter);
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("Matter", matter.Id.ToString(), "Created",
            performedBy, $"Title: {matter.Title}, ClientId: {matter.ClientId}");

        return await GetMatterByIdAsync(matter.Id, Guid.Empty, "Admin") ?? ToDto(matter);
    }

    // ── Update ────────────────────────────────────────
    public async Task<MatterDto?> UpdateMatterAsync(Guid matterId, UpdateMatterRequest request, string performedBy)
    {
        var matter = await _db.Matters.FindAsync(matterId);
        if (matter == null) return null;

        matter.Title            = request.Title;
        matter.JICMSCaseNumber  = request.JICMSCaseNumber;
        matter.CourtStation     = request.CourtStation;
        matter.Status           = request.Status;
        matter.AssignedLawyerId = request.AssignedLawyerId;
        matter.HearingDate      = ToUtc(request.HearingDate);
        matter.FilingDeadline   = ToUtc(request.FilingDeadline);
        matter.UpdatedAt        = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        await _audit.WriteAsync("Matter", matterId.ToString(), "Updated",
            performedBy, $"Title: {request.Title}, Status: {request.Status}");

        return await GetMatterByIdAsync(matterId, Guid.Empty, "Admin");
    }

    // ── Assign lawyer ─────────────────────────────────
    public async Task<bool> AssignLawyerAsync(Guid matterId, Guid lawyerId, string performedBy)
    {
        var matter = await _db.Matters.FindAsync(matterId);
        if (matter == null) return false;

        matter.AssignedLawyerId = lawyerId;
        matter.UpdatedAt        = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("Matter", matterId.ToString(), "LawyerAssigned",
            performedBy, $"LawyerId: {lawyerId}");

        return true;
    }

    // ── Staff management ──────────────────────────────
    public async Task<List<MatterStaffDto>> GetStaffAsync(Guid matterId)
    {
        return await _db.MatterStaff
            .Include(ms => ms.User)
            .Where(ms => ms.MatterId == matterId)
            .OrderBy(ms => ms.AssignedAt)
            .Select(ms => new MatterStaffDto(
                ms.UserId,
                ms.User!.FirstName + " " + ms.User.LastName,
                ms.Role,
                ms.AssignedAt))
            .ToListAsync();
    }

    public async Task<(bool Success, string Message)> AddStaffAsync(
        Guid matterId, Guid userId, string role, string performedBy)
    {
        var matter = await _db.Matters.FindAsync(matterId);
        if (matter == null) return (false, "Matter not found.");

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return (false, "User not found.");

        var exists = await _db.MatterStaff
            .AnyAsync(ms => ms.MatterId == matterId && ms.UserId == userId);
        if (exists) return (false, "User is already assigned to this matter.");

        _db.MatterStaff.Add(new MatterStaff
        {
            MatterId   = matterId,
            UserId     = userId,
            Role       = role,
            AssignedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();

        await _audit.WriteAsync("Matter", matterId.ToString(), "StaffAdded",
            performedBy, $"UserId: {userId}, Role: {role}");

        return (true, "Staff member added.");
    }

    public async Task<(bool Success, string Message)> RemoveStaffAsync(
        Guid matterId, Guid userId, string performedBy)
    {
        var entry = await _db.MatterStaff
            .FirstOrDefaultAsync(ms => ms.MatterId == matterId && ms.UserId == userId);

        if (entry == null) return (false, "Staff assignment not found.");

        _db.MatterStaff.Remove(entry);
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("Matter", matterId.ToString(), "StaffRemoved",
            performedBy, $"UserId: {userId}");

        return (true, "Staff member removed.");
    }

    // ── Status ────────────────────────────────────────
    public async Task<bool> ChangeStatusAsync(Guid matterId, string status, string performedBy)
    {
        var matter = await _db.Matters.FindAsync(matterId);
        if (matter == null) return false;

        matter.Status    = status;
        matter.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("Matter", matterId.ToString(), "StatusChanged",
            performedBy, $"Status: {status}");

        return true;
    }

    public async Task<bool> CloseMatterAsync(Guid matterId, string performedBy)
        => await ChangeStatusAsync(matterId, "Closed", performedBy);

    // ── Delete ────────────────────────────────────────
    public async Task<bool> DeleteMatterAsync(Guid matterId, string performedBy)
    {
        var matter = await _db.Matters.FindAsync(matterId);
        if (matter == null) return false;

        var title = matter.Title;
        _db.Matters.Remove(matter);
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("Matter", matterId.ToString(), "Deleted",
            performedBy, $"Title: {title}");

        return true;
    }

    // ── DTO mapping ───────────────────────────────────
    private static MatterDto ToDto(Matter m) => new(
        m.Id, m.Title, m.JICMSCaseNumber, m.CourtStation, m.Status,
        m.HearingDate, m.FilingDeadline, m.ClientId,
        m.Client != null ? m.Client.Name : "Unknown",
        m.AssignedLawyerId,
        m.AssignedLawyer != null ? m.AssignedLawyer.FullName : null,
        m.Staff?.Select(ms => new MatterStaffDto(
            ms.UserId,
            ms.User != null ? ms.User.FirstName + " " + ms.User.LastName : "Unknown",
            ms.Role,
            ms.AssignedAt)).ToList() ?? new(),
        m.CreatedAt, m.UpdatedAt
    );
}