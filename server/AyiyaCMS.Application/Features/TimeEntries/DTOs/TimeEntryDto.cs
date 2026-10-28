// AyiyaCMS.Application/Features/TimeEntries/DTOs/TimeEntryDto.cs
namespace AyiyaCMS.Application.Features.TimeEntries.DTOs;

public record TimeEntryDto(
    Guid Id,
    Guid MatterId,
    string MatterTitle,
    Guid UserId,
    string UserName,
    string Description,
    decimal Hours,
    decimal Rate,
    decimal Amount,   // Hours * Rate — computed once here so the frontend never redoes this math
    bool IsBilled,
    DateTime EntryDate,
    DateTime CreatedAt
);