// AyiyaCMS.API/Controllers/AuthController.cs
using AyiyaCMS.Application.Features.Auth.DTOs;
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Features.Auth;
using AyiyaCMS.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly LoginCommand _loginCommand;
    private readonly RegisterCommand _registerCommand;
    private readonly MfaCommand _mfaCommand;
    private readonly ResetPasswordCommand _resetPasswordCommand;
    public AuthController(
        LoginCommand loginCommand,
        RegisterCommand registerCommand,
        MfaCommand mfaCommand,
        ResetPasswordCommand resetPasswordCommand)
    {
        _loginCommand = loginCommand;
        _registerCommand = registerCommand;
        _mfaCommand = mfaCommand;
        _resetPasswordCommand = resetPasswordCommand;
    }

    // ── POST /api/auth/login ──────────────────────────
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _loginCommand.ExecuteAsync(request);

        if (result == null)
            return Unauthorized(new { message = "Invalid email or password." });

        var (response, refreshToken) = result.Value;

        if (response.MfaRequired)
            return Ok(new { mfaRequired = true, email = request.Email });

        SetRefreshTokenCookie(refreshToken);
        return Ok(response);
    }

    // ── POST /api/auth/verify-mfa ─────────────────────
    [HttpPost("verify-mfa")]
    public async Task<IActionResult> VerifyMfa([FromBody] VerifyMfaRequest request)
    {
        var result = await _loginCommand.VerifyMfaAndLoginAsync(request.Email, request.Code);

        if (result == null)
            return Unauthorized(new { message = "Invalid or expired code." });

        (AuthResponse response, string refreshToken) = result.Value;
        SetRefreshTokenCookie(refreshToken);
        return Ok(response);
    }

    // ── POST /api/auth/register ───────────────────────
    [HttpPost("register")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var success = await _registerCommand.ExecuteAsync(request);

        if (!success)
            return Conflict(new { message = "A user with this email already exists." });

        return Ok(new { message = "User registered successfully." });
    }

    // ── POST /api/auth/refresh ────────────────────────
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(
        [FromServices] AppDbContext db,
        [FromServices] TokenService tokenService)
    {
        var incomingToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrEmpty(incomingToken))
            return Unauthorized();

        var candidates = await db.Users
            .Where(u => u.RefreshTokenExpiry > DateTime.UtcNow && u.IsActive)
            .ToListAsync();

        var user = candidates
            .FirstOrDefault(u => BCrypt.Net.BCrypt.Verify(incomingToken, u.RefreshToken));

        if (user == null)
            return Unauthorized();

        var newAccessToken = tokenService.GenerateAccessToken(user);
        return Ok(new { accessToken = newAccessToken });
    }

    // ── POST /api/auth/logout ─────────────────────────
    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("refreshToken");
        return Ok(new { message = "Logged out successfully." });
    }

    // ── POST /api/auth/mfa/setup ──────────────────────
    [HttpPost("mfa/setup")]
    [Authorize]
    public async Task<IActionResult> SetupMfa()
    {
        var userId = Guid.Parse(User.FindFirst(
            System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

        var result = await _mfaCommand.InitiateMfaSetupAsync(userId);
        if (result == null)
            return NotFound(new { message = "User not found." });

        var (secret, qrUri) = result.Value;
        return Ok(new { secret, qrUri });
    }

    // ── POST /api/auth/mfa/confirm ────────────────────
    [HttpPost("mfa/confirm")]
    [Authorize]
    public async Task<IActionResult> ConfirmMfa([FromBody] VerifyMfaRequest request)
    {
        var userId = Guid.Parse(User.FindFirst(
            System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

        var success = await _mfaCommand.ConfirmMfaSetupAsync(userId, request.Code);
        if (!success)
            return BadRequest(new { message = "Invalid code. Please try again." });

        return Ok(new { message = "MFA enabled successfully." });
    }

    // ── POST /api/auth/mfa/disable ────────────────────
    [HttpPost("mfa/disable")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DisableMfa([FromBody] Guid userId)
    {
        var success = await _mfaCommand.DisableMfaAsync(userId);
        if (!success)
            return NotFound(new { message = "User not found." });

        return Ok(new { message = "MFA disabled." });
    }

    // ── Helper ────────────────────────────────────────
    private void SetRefreshTokenCookie(string refreshToken)
    {
        Response.Cookies.Append("refreshToken", refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });
    }

// ── POST /api/auth/reset-password ────────────────────
[HttpPost("reset-password")]
public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Token) ||
        string.IsNullOrWhiteSpace(request.NewPassword))
        return BadRequest(new { message = "Token and new password are required." });

    var (success, message) = await _resetPasswordCommand.ExecuteAsync(
        request.Token, request.NewPassword);

    if (!success) return BadRequest(new { message });
    return Ok(new { message });
}

// ── POST /api/auth/change-password ───────────────────
[HttpPost("change-password")]
[Authorize]
public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
{
    var userId = Guid.Parse(User.FindFirst(
        System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

    var (success, message) = await _resetPasswordCommand.ChangePasswordAsync(
        userId, request.CurrentPassword, request.NewPassword);

    if (!success) return BadRequest(new { message });
    return Ok(new { message });
}
}