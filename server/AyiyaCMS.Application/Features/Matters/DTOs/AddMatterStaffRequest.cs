// AyiyaCMS.Application/Features/Matters/DTOs/AddMatterStaffRequest.cs
namespace AyiyaCMS.Application.Features.Matters.DTOs;

public record AddMatterStaffRequest(Guid UserId, string Role);