// AyiyaCMS.Application/Features/Calendar/DTOs/UserTaskDto.cs
namespace AyiyaCMS.Application.Features.Calendar.DTOs;

public record UserTaskDto(
    Guid Id,
    string Title,
    string? Description,
    DateTime DueDate,
    string Priority,
    bool IsCompleted,
    DateTime? CompletedAt,
    Guid AssignedToId,
    string AssignedToName,
    Guid? AssignedById,
    string? AssignedByName,
    Guid? MatterId,
    string? MatterTitle,
    List<ReminderDto> Reminders,
    DateTime CreatedAt
);

public record CreateUserTaskRequest(
    string Title,
    string? Description,
    DateTime DueDate,
    string Priority,
    Guid? MatterId,
    Guid? AssignedToId,   // if null, assigned to self
    List<CreateReminderRequest> Reminders
);

public record UpdateUserTaskRequest(
    string Title,
    string? Description,
    DateTime DueDate,
    string Priority,
    Guid? MatterId
);