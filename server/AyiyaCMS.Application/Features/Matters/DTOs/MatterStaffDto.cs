// AyiyaCMS.Application/Features/Matters/DTOs/MatterStaffDto.cs
namespace AyiyaCMS.Application.Features.Matters.DTOs;

public record MatterStaffDto(
    Guid   UserId,
    string Name,
    string Role,
    DateTime AssignedAt
);