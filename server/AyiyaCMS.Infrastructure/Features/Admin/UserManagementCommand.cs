// AyiyaCMS.Infrastructure/Features/Admin/UserManagementCommand.cs
// REPLACE existing file
using AyiyaCMS.Application.Features.Admin.DTOs;
using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Infrastructure.Features.Admin;

public class UserManagementCommand
{
    private readonly AppDbContext _db;
    private readonly IEmailService _email;
    private readonly AuditService _audit;

    public UserManagementCommand(AppDbContext db, IEmailService email, AuditService audit)
    {
        _db    = db;
        _email = email;
        _audit = audit;
    }

    public async Task<List<UserDto>> GetAllUsersAsync()
    {
        return await _db.Users
            .OrderBy(u => u.LastName)
            .Select(u => new UserDto(
                u.Id, u.FirstName, u.LastName, u.Email,
                u.Role, u.IsActive, u.MfaEnabled, u.CreatedAt))
            .ToListAsync();
    }

    public async Task<(bool success, string message)> InviteUserAsync(
        InviteUserRequest request, string invitedByName)
    {
        bool exists = await _db.Users.AnyAsync(u => u.Email == request.Email);
        if (exists) return (false, "A user with this email already exists.");

        var (token, tokenHash) = GenerateResetToken();
        var fullName = $"{request.FirstName} {request.LastName}".Trim();

        var user = new User
        {
            Id                 = Guid.NewGuid(),
            FirstName          = request.FirstName,
            LastName           = request.LastName,
            Email              = request.Email.ToLower().Trim(),
            PasswordHash       = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
            Role               = request.Role,
            IsActive           = true,
            MustChangePassword = true,
            ResetToken         = tokenHash,
            ResetTokenExpiry   = DateTime.UtcNow.AddHours(24),
            CreatedAt          = DateTime.UtcNow,
            UpdatedAt          = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("User", user.Id.ToString(), "Invited",
            invitedByName, $"Email: {user.Email}, Role: {user.Role}");

        _ = _email.SendInviteEmailAsync(user.Email, fullName, token)
            .ContinueWith(t => Console.WriteLine($"[EMAIL ERROR] {t.Exception?.Message}"),
                TaskContinuationOptions.OnlyOnFaulted);

        return (true, $"Invitation sent to {user.Email}.");
    }

    public async Task<bool> UpdateRoleAsync(Guid userId, string newRole, string changedByName)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return false;

        var oldRole    = user.Role;
        user.Role      = newRole;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("User", userId.ToString(), "RoleChanged",
            changedByName, $"{user.Email}: {oldRole} → {newRole}");

        return true;
    }

    public async Task<bool> DeactivateUserAsync(Guid userId, string deactivatedByName)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return false;

        user.IsActive           = false;
        user.RefreshToken       = null;
        user.RefreshTokenExpiry = null;
        user.UpdatedAt          = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("User", userId.ToString(), "Deactivated",
            deactivatedByName, $"Email: {user.Email}");

        return true;
    }

    public async Task<bool> ReactivateUserAsync(Guid userId, string reactivatedByName)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return false;

        user.IsActive  = true;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("User", userId.ToString(), "Reactivated",
            reactivatedByName, $"Email: {user.Email}");

        return true;
    }

    public async Task<(bool success, string message)> ResetPasswordAsync(
        Guid userId, string resetByName)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return (false, "User not found.");

        var (token, tokenHash) = GenerateResetToken();
        user.ResetToken         = tokenHash;
        user.ResetTokenExpiry   = DateTime.UtcNow.AddHours(24);
        user.MustChangePassword = true;
        user.RefreshToken       = null;
        user.RefreshTokenExpiry = null;
        user.UpdatedAt          = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("User", userId.ToString(), "PasswordReset",
            resetByName, $"Reset link sent to {user.Email}");

        _ = _email.SendPasswordResetEmailAsync(user.Email, user.FullName, token)
            .ContinueWith(t => Console.WriteLine($"[EMAIL ERROR] {t.Exception?.Message}"),
                TaskContinuationOptions.OnlyOnFaulted);

        return (true, $"Password reset link sent to {user.Email}.");
    }

    private static (string token, string hash) GenerateResetToken()
    {
        var token = Convert.ToBase64String(
            System.Security.Cryptography.RandomNumberGenerator.GetBytes(48))
            .Replace("+", "-").Replace("/", "_").Replace("=", "");
        var hash = BCrypt.Net.BCrypt.HashPassword(token);
        return (token, hash);
    }
}