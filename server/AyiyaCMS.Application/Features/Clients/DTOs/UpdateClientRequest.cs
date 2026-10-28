// AyiyaCMS.Application/Features/Clients/DTOs/UpdateClientRequest.cs
namespace AyiyaCMS.Application.Features.Clients.DTOs;

public record UpdateClientRequest(
    string Name,
    string Email,
    string Phone,
    string Address
);