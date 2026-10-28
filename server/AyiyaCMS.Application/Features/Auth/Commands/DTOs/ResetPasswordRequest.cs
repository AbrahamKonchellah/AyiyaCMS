// AyiyaCMS.Application/Features/Auth/Commands/DTOs/ResetPasswordRequest.cs
namespace AyiyaCMS.Application.Features.Auth.DTOs;

public record ResetPasswordRequest(
    string Token,
    string NewPassword
);
