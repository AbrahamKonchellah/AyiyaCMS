// AyiyaCMS.Infrastructure/Services/MfaService.cs
using OtpNet;
using AyiyaCMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Infrastructure.Services;

public class MfaService
{
    private readonly AppDbContext _db;

    public MfaService(AppDbContext db) => _db = db;

    // Called when a user wants to ENABLE MFA
    // Returns the secret and a URI to generate a QR code
    public (string secret, string qrUri) GenerateMfaSetup(string email)
    {
        // Generate a random secret key
        var secretBytes = KeyGeneration.GenerateRandomKey(20);
        var secret = Base32Encoding.ToString(secretBytes);

        // URI format that authenticator apps (Google, Microsoft) understand
        var qrUri = $"otpauth://totp/AyiyaCMS:{Uri.EscapeDataString(email)}" +
                    $"?secret={secret}&issuer=AyiyaCMS&algorithm=SHA1&digits=6&period=30";

        return (secret, qrUri);
    }

    // Verifies a 6-digit TOTP code against the user's stored secret
    public bool VerifyCode(string secret, string code)
    {
        try
        {
            var secretBytes = Base32Encoding.ToBytes(secret);
            var totp = new Totp(secretBytes);

            // VerifyTotp allows a 1-step window (30 sec before/after) for clock drift
            return totp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedNetworkDelay);
        }
        catch
        {
            return false;
        }
    }

    // Called after password verification when MFA is enabled
    public async Task<bool> VerifyMfaAsync(string email, string code)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == email && u.IsActive);

        if (user == null || !user.MfaEnabled || string.IsNullOrEmpty(user.MfaSecret))
            return false;

        return VerifyCode(user.MfaSecret, code);
    }
}