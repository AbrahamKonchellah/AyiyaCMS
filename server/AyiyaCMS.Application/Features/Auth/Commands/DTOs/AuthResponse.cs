// AyiyaCMS.Application/Features/Auth/Commands/DTOs/AuthResponse.cs
namespace AyiyaCMS.Application.Features.Auth.DTOs;

public record AuthResponse(
    string AccessToken,
    bool MfaRequired,
    bool MustChangePassword,
    string Role,
    string Name,
    string Email
);