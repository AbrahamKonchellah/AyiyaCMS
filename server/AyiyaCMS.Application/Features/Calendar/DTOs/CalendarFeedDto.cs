// AyiyaCMS.Application/Features/Calendar/DTOs/CalendarFeedDto.cs
// What the calendar page actually receives — a mixed list of matter
// deadlines, user events (including expanded recurrences), and tasks.
namespace AyiyaCMS.Application.Features.Calendar.DTOs;

public record CalendarFeedItem(
    string Id,           // prefixed: "event-{guid}", "task-{guid}", "hearing-{guid}", "filing-{guid}"
    string Kind,         // "Event" | "Task" | "Hearing" | "Filing"
    string Title,
    string? ClientName,
    string? MatterTitle,
    string? Location,
    DateTime Date,       // start date — for display and urgency colouring
    DateTime? EndDate,
    bool IsAllDay,
    bool IsCompleted,    // always false for non-tasks
    string? Color,
    string? Priority,
    Guid? MatterId,
    Guid? SourceId       // the real entity id (without prefix)
);