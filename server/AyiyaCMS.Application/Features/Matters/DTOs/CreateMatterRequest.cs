// AyiyaCMS.Application/Features/Matters/DTOs/CreateMatterRequest.cs
namespace AyiyaCMS.Application.Features.Matters.DTOs;

public record CreateMatterRequest(
    string Title,
    string JICMSCaseNumber,
    string CourtStation,
    Guid ClientId,
    Guid? AssignedLawyerId,
    DateTime? HearingDate,
    DateTime? FilingDeadline
);