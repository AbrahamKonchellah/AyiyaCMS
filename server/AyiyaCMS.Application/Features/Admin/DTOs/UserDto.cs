namespace AyiyaCMS.Application.Features.Admin.DTOs;

public record UserDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string Role,
    bool IsActive,
    bool MfaEnabled,
    DateTime CreatedAt
);