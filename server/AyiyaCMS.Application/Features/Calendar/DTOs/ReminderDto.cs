// AyiyaCMS.Application/Features/Calendar/DTOs/ReminderDto.cs
namespace AyiyaCMS.Application.Features.Calendar.DTOs;

public record ReminderDto(
    Guid Id,
    string Message,
    DateTime RemindAt,
    bool SentEmail,
    DateTime? ReadAt
);

public record CreateReminderRequest(
    string Message,
    DateTime RemindAt
);