// AyiyaCMS.Application/Features/TimeEntries/DTOs/CreateTimeEntryRequest.cs
namespace AyiyaCMS.Application.Features.TimeEntries.DTOs;

public record CreateTimeEntryRequest(
    Guid MatterId,
    string Description,
    decimal Hours,
    decimal Rate,
    DateTime EntryDate
);