// AyiyaCMS.Application/Features/Auth/DTOs/RegisterRequest.cs
namespace AyiyaCMS.Application.Features.Auth.DTOs;

public record RegisterRequest(
    string FirstName,
    string LastName,
    string Email,
    string Password,
    string Role
);