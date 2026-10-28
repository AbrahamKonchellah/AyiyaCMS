// AyiyaCMS.Application/Features/Clients/DTOs/CreateClientRequest.cs
namespace AyiyaCMS.Application.Features.Clients.DTOs;

public record CreateClientRequest(
    string Name,
    string Email,
    string Phone,
    string Address
);