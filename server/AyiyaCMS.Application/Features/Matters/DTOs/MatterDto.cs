// AyiyaCMS.Application/Features/Matters/DTOs/MatterDto.cs
namespace AyiyaCMS.Application.Features.Matters.DTOs;

public record MatterDto(
    Guid        Id,
    string      Title,
    string      JICMSCaseNumber,
    string      CourtStation,
    string      Status,
    DateTime?   HearingDate,
    DateTime?   FilingDeadline,
    Guid        ClientId,
    string      ClientName,
    Guid?       AssignedLawyerId,
    string?     AssignedLawyerName,
    List<MatterStaffDto> Staff,       // ← new
    DateTime    CreatedAt,
    DateTime    UpdatedAt
);