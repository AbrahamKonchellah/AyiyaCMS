// AyiyaCMS.Infrastructure/Features/Auth/LoginCommand.cs
// REPLACE existing file
using AyiyaCMS.Application.Features.Auth.DTOs;
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Infrastructure.Features.Auth;

public class LoginCommand
{
    private readonly AppDbContext _db;
    private readonly TokenService _tokenService;
    private readonly MfaService _mfaService;
    private readonly AuditService _audit;

    public LoginCommand(
        AppDbContext db, TokenService tokenService,
        MfaService mfaService, AuditService audit)
    {
        _db           = db;
        _tokenService = tokenService;
        _mfaService   = mfaService;
        _audit        = audit;
    }

    public async Task<(AuthResponse response, string refreshToken)?> ExecuteAsync(
        LoginRequest request)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email.ToLower().Trim());

        if (user == null || !user.IsActive) return null;
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash)) return null;

        if (user.MfaEnabled)
            return (new AuthResponse(
                AccessToken:        string.Empty,
                MfaRequired:        true,
                MustChangePassword: false,
                Role:               user.Role,
                Name:               user.FullName,
                Email:              user.Email
            ), string.Empty);

        return await IssueTokensAsync(user);
    }

    public async Task<(AuthResponse response, string refreshToken)?> VerifyMfaAndLoginAsync(
        string email, string code)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == email.ToLower().Trim());

        if (user == null || !user.IsActive || !user.MfaEnabled) return null;
        if (!_mfaService.VerifyCode(user.MfaSecret!, code)) return null;

        return await IssueTokensAsync(user);
    }

    private async Task<(AuthResponse, string)> IssueTokensAsync(
        AyiyaCMS.Domain.Entities.User user)
    {
        var accessToken  = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken       = BCrypt.Net.BCrypt.HashPassword(refreshToken);
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        user.UpdatedAt          = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("User", user.Id.ToString(), "Login", user.FullName);

        return (new AuthResponse(
            AccessToken:        accessToken,
            MfaRequired:        false,
            MustChangePassword: user.MustChangePassword,
            Role:               user.Role,
            Name:               user.FullName,
            Email:              user.Email
        ), refreshToken);
    }
}