// AyiyaCMS.Infrastructure/Features/Auth/MfaCommand.cs
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Infrastructure.Features.Auth;

public class MfaCommand
{
    private readonly AppDbContext _db;
    private readonly MfaService _mfaService;

    public MfaCommand(AppDbContext db, MfaService mfaService)
    {
        _db = db;
        _mfaService = mfaService;
    }

    // Step 1 — Generate setup info (call this to show QR code to user)
    public async Task<(string secret, string qrUri)?> InitiateMfaSetupAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return null;

        var (secret, qrUri) = _mfaService.GenerateMfaSetup(user.Email);

        // Store secret temporarily — not enabled until confirmed
        user.MfaSecret = secret;
        await _db.SaveChangesAsync();

        return (secret, qrUri);
    }

    // Step 2 — Confirm setup (user scans QR and enters first code to confirm)
    public async Task<bool> ConfirmMfaSetupAsync(Guid userId, string code)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null || string.IsNullOrEmpty(user.MfaSecret)) return false;

        bool valid = _mfaService.VerifyCode(user.MfaSecret, code);
        if (!valid) return false;

        // Now officially enable MFA
        user.MfaEnabled = true;
        await _db.SaveChangesAsync();
        return true;
    }

    // Disable MFA (Partner/Admin can do this, or user themselves)
    public async Task<bool> DisableMfaAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return false;

        user.MfaEnabled = false;
        user.MfaSecret = null;
        await _db.SaveChangesAsync();
        return true;
    }
}