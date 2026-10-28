// AyiyaCMS.Application/Features/Calendar/DTOs/CalendarEventDto.cs
namespace AyiyaCMS.Application.Features.Calendar.DTOs;

public record CalendarEventDto(
    Guid Id,
    string Title,
    string? Description,
    string? Location,
    DateTime StartAt,
    DateTime? EndAt,
    bool IsAllDay,
    string? Color,
    string? RecurrenceRule,
    Guid CreatedById,
    string CreatedByName,
    Guid? MatterId,
    string? MatterTitle,
    List<ReminderDto> Reminders,
    DateTime CreatedAt
);

public record CreateCalendarEventRequest(
    string Title,
    string? Description,
    string? Location,
    DateTime StartAt,
    DateTime? EndAt,
    bool IsAllDay,
    string? Color,
    string? RecurrenceRule,
    Guid? MatterId,
    List<CreateReminderRequest> Reminders
);

public record UpdateCalendarEventRequest(
    string Title,
    string? Description,
    string? Location,
    DateTime StartAt,
    DateTime? EndAt,
    bool IsAllDay,
    string? Color,
    string? RecurrenceRule,
    Guid? MatterId
);