// AyiyaCMS.Application/Features/Auth/Commands/DTOs/ChangePasswordRequest.cs
namespace AyiyaCMS.Application.Features.Auth.DTOs;

public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword
);
