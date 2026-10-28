// AyiyaCMS.Infrastructure/Features/Auth/ResetPasswordCommand.cs
using AyiyaCMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Infrastructure.Features.Auth;

public class ResetPasswordCommand
{
    private readonly AppDbContext _db;

    public ResetPasswordCommand(AppDbContext db) => _db = db;

    // ── Validate token + set new password ────────────
    public async Task<(bool success, string message)> ExecuteAsync(
        string token, string newPassword)
    {
        // Find candidates with a non-expired token
        var candidates = await _db.Users
            .Where(u => u.ResetToken != null &&
                        u.ResetTokenExpiry > DateTime.UtcNow &&
                        u.IsActive)
            .ToListAsync();

        var user = candidates.FirstOrDefault(u =>
            BCrypt.Net.BCrypt.Verify(token, u.ResetToken));

        if (user == null)
            return (false, "This link is invalid or has expired. Please request a new one.");

        user.PasswordHash       = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.MustChangePassword  = false;
        user.ResetToken          = null;
        user.ResetTokenExpiry    = null;
        user.RefreshToken        = null;
        user.RefreshTokenExpiry  = null;
        user.UpdatedAt           = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return (true, "Your password has been set successfully. You can now sign in.");
    }

    // ── Change password (logged-in, forced change) ───
    public async Task<(bool success, string message)> ChangePasswordAsync(
        Guid userId, string currentPassword, string newPassword)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return (false, "User not found.");

        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
            return (false, "Your current password is incorrect.");

        if (BCrypt.Net.BCrypt.Verify(newPassword, user.PasswordHash))
            return (false, "Your new password must be different from your current password.");

        user.PasswordHash       = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.MustChangePassword  = false;
        user.UpdatedAt           = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return (true, "Password updated successfully.");
    }
}