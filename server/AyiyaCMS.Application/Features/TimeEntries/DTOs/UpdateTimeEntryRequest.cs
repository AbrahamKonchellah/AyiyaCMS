// AyiyaCMS.Application/Features/TimeEntries/DTOs/UpdateTimeEntryRequest.cs
namespace AyiyaCMS.Application.Features.TimeEntries.DTOs;

public record UpdateTimeEntryRequest(
    string Description,
    decimal Hours,
    decimal Rate,
    DateTime EntryDate
);