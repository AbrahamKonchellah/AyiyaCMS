// AyiyaCMS.Application/Features/Matters/DTOs/UpdateMatterRequest.cs
namespace AyiyaCMS.Application.Features.Matters.DTOs;

public record UpdateMatterRequest(
    string Title,
    string JICMSCaseNumber,
    string CourtStation,
    string Status,
    Guid? AssignedLawyerId,
    DateTime? HearingDate,
    DateTime? FilingDeadline
);