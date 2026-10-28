namespace AyiyaCMS.Application.Features.Admin.DTOs;

public record InviteUserRequest(
    string FirstName,
    string LastName,
    string Email,
    string Role
);