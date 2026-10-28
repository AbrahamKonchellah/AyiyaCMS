// AyiyaCMS.Application/Features/Clients/DTOs/ClientDto.cs
namespace AyiyaCMS.Application.Features.Clients.DTOs;

public record ClientDto(
    Guid Id,
    string Name,
    string Email,
    string Phone,
    string Address,
    int MatterCount,
    DateTime CreatedAt
);
