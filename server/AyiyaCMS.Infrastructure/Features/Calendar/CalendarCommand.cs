// AyiyaCMS.Infrastructure/Features/Calendar/CalendarCommand.cs
using AyiyaCMS.Application.Features.Calendar.DTOs;
using DomainCalendarEvent = AyiyaCMS.Domain.Entities.CalendarEvent;
using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Data;
using Ical.Net;
using IcalCalendarEvent = Ical.Net.CalendarComponents.CalendarEvent;
using Ical.Net.DataTypes;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Infrastructure.Features.Calendar;

public class CalendarCommand
{
    private readonly AppDbContext _db;

    public CalendarCommand(AppDbContext db) => _db = db;

    // ── Calendar feed for a month ─────────────────────
    public async Task<List<CalendarFeedItem>> GetFeedAsync(
        Guid userId, string userRole, int year, int month)
    {
        var windowStart = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var windowEnd   = windowStart.AddMonths(1);
        
        var items       = new List<CalendarFeedItem>();

        // 1. Matter hearing dates and filing deadlines (all accessible matters)
        var matters = await _db.Matters
            .Include(m => m.Client)
            .Where(m =>
                (userRole == "Admin" || userRole == "Partner") ||
                m.AssignedLawyerId == userId)
            .Where(m =>
                (m.HearingDate.HasValue && m.HearingDate >= windowStart && m.HearingDate < windowEnd) ||
                (m.FilingDeadline.HasValue && m.FilingDeadline >= windowStart && m.FilingDeadline < windowEnd))
            .ToListAsync();

        foreach (var m in matters)
        {
            if (m.HearingDate.HasValue && m.HearingDate >= windowStart && m.HearingDate < windowEnd)
                items.Add(new CalendarFeedItem(
                    $"hearing-{m.Id}", "Hearing", m.Title,
                    m.Client?.Name, m.Title, null,
                    m.HearingDate.Value, null, false, false,
                    "#B91C1C", null, m.Id, m.Id));

            if (m.FilingDeadline.HasValue && m.FilingDeadline >= windowStart && m.FilingDeadline < windowEnd)
                items.Add(new CalendarFeedItem(
                    $"filing-{m.Id}", "Filing", m.Title,
                    m.Client?.Name, m.Title, null,
                    m.FilingDeadline.Value, null, true, false,
                    "#D4A853", null, m.Id, m.Id));
        }

        // 2. User's own calendar events (private) + expand recurrences
        var events = await _db.CalendarEvents
            .Include(e => e.Matter)
            .Include(e => e.Reminders)
            .Where(e => e.CreatedById == userId)
            .ToListAsync();

        foreach (var ev in events)
        {
            if (string.IsNullOrEmpty(ev.RecurrenceRule))
            {
                // Non-recurring — check if it falls in window
                if (ev.StartAt < windowEnd && (ev.EndAt ?? ev.StartAt) >= windowStart)
                    items.Add(ToFeedItem(ev, ev.StartAt, ev.EndAt));
            }
            else
            {
                // Expand recurrence using Ical.Net
                var occurrences = ExpandRecurrence(ev, windowStart, windowEnd);
                foreach (var (start, end) in occurrences)
                    items.Add(ToFeedItem(ev, start, end));
            }
        }

        // 3. Tasks assigned to this user due this month
        var tasks = await _db.UserTasks
            .Include(t => t.AssignedBy)
            .Include(t => t.Matter)
            .Include(t => t.Reminders)
            .Where(t =>
                t.AssignedToId == userId &&
                t.DueDate >= windowStart && t.DueDate < windowEnd)
            .ToListAsync();

        foreach (var t in tasks)
            items.Add(new CalendarFeedItem(
                $"task-{t.Id}", "Task", t.Title,
                null, t.Matter?.Title, null,
                t.DueDate, null, true, t.IsCompleted,
                t.Priority == "High" ? "#B91C1C" : t.Priority == "Normal" ? "#1A5C52" : "#888",
                t.Priority, t.MatterId, t.Id));

        return items.OrderBy(i => i.Date).ToList();
    }

    // ── CalendarEvent CRUD ────────────────────────────
    public async Task<CalendarEventDto> CreateEventAsync(
        CreateCalendarEventRequest req, Guid userId)
    {
        var ev = new CalendarEvent
        {
            Id             = Guid.NewGuid(),
            Title          = req.Title,
            Description    = req.Description,
            Location       = req.Location,
            StartAt        = DateTime.SpecifyKind(req.StartAt, DateTimeKind.Utc),
            EndAt          = req.EndAt.HasValue ? DateTime.SpecifyKind(req.EndAt.Value, DateTimeKind.Utc) : null,
            IsAllDay       = req.IsAllDay,
            Color          = req.Color,
            RecurrenceRule = req.RecurrenceRule,
            MatterId       = req.MatterId,
            CreatedById    = userId,
            CreatedAt      = DateTime.UtcNow,
            UpdatedAt      = DateTime.UtcNow,
        };

        _db.CalendarEvents.Add(ev);

        foreach (var r in req.Reminders)
            _db.Reminders.Add(new Reminder
            {
                Id        = Guid.NewGuid(),
                Message   = r.Message,
                RemindAt  = DateTime.SpecifyKind(r.RemindAt, DateTimeKind.Utc),
                EventId   = ev.Id,
                UserId    = userId,
                CreatedAt = DateTime.UtcNow,
            });

        await _db.SaveChangesAsync();
        return await GetEventByIdAsync(ev.Id) ?? throw new Exception("Event not found after save.");
    }

    public async Task<CalendarEventDto?> UpdateEventAsync(
        Guid id, UpdateCalendarEventRequest req, Guid userId)
    {
        var ev = await _db.CalendarEvents.FirstOrDefaultAsync(e => e.Id == id && e.CreatedById == userId);
        if (ev == null) return null;

        ev.Title          = req.Title;
        ev.Description    = req.Description;
        ev.Location       = req.Location;
        ev.StartAt        = DateTime.SpecifyKind(req.StartAt, DateTimeKind.Utc);
        ev.EndAt          = req.EndAt.HasValue ? DateTime.SpecifyKind(req.EndAt.Value, DateTimeKind.Utc) : null;
        ev.IsAllDay       = req.IsAllDay;
        ev.Color          = req.Color;
        ev.RecurrenceRule = req.RecurrenceRule;
        ev.MatterId       = req.MatterId;
        ev.UpdatedAt      = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await GetEventByIdAsync(id);
    }

    public async Task<bool> DeleteEventAsync(Guid id, Guid userId)
    {
        var ev = await _db.CalendarEvents.FirstOrDefaultAsync(e => e.Id == id && e.CreatedById == userId);
        if (ev == null) return false;
        _db.CalendarEvents.Remove(ev);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<CalendarEventDto?> GetEventByIdAsync(Guid id)
    {
        var ev = await _db.CalendarEvents
            .Include(e => e.CreatedBy)
            .Include(e => e.Matter)
            .Include(e => e.Reminders)
            .FirstOrDefaultAsync(e => e.Id == id);
        return ev == null ? null : ToEventDto(ev);
    }

    // ── UserTask CRUD ─────────────────────────────────
    public async Task<UserTaskDto> CreateTaskAsync(
        CreateUserTaskRequest req, Guid requesterId, string requesterRole)
    {
        // Partners can assign to others; everyone else assigns to self
        var assignedToId = (requesterRole == "Partner" || requesterRole == "Admin") && req.AssignedToId.HasValue
            ? req.AssignedToId.Value
            : requesterId;

        var task = new UserTask
        {
            Id           = Guid.NewGuid(),
            Title        = req.Title,
            Description  = req.Description,
            DueDate      = DateTime.SpecifyKind(req.DueDate, DateTimeKind.Utc),
            Priority     = req.Priority,
            MatterId     = req.MatterId,
            AssignedToId = assignedToId,
            AssignedById = assignedToId != requesterId ? requesterId : null,
            CreatedAt    = DateTime.UtcNow,
            UpdatedAt    = DateTime.UtcNow,
        };

        _db.UserTasks.Add(task);

        foreach (var r in req.Reminders)
            _db.Reminders.Add(new Reminder
            {
                Id        = Guid.NewGuid(),
                Message   = r.Message,
                RemindAt  = DateTime.SpecifyKind(r.RemindAt, DateTimeKind.Utc),
                TaskId    = task.Id,
                UserId    = assignedToId,
                CreatedAt = DateTime.UtcNow,
            });

        await _db.SaveChangesAsync();
        return await GetTaskByIdAsync(task.Id) ?? throw new Exception("Task not found after save.");
    }

    public async Task<UserTaskDto?> UpdateTaskAsync(
        Guid id, UpdateUserTaskRequest req, Guid userId)
    {
        var task = await _db.UserTasks
            .FirstOrDefaultAsync(t => t.Id == id && t.AssignedToId == userId);
        if (task == null) return null;

        task.Title       = req.Title;
        task.Description = req.Description;
        task.DueDate     = DateTime.SpecifyKind(req.DueDate, DateTimeKind.Utc);
        task.Priority    = req.Priority;
        task.MatterId    = req.MatterId;
        task.UpdatedAt   = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await GetTaskByIdAsync(id);
    }

    public async Task<bool> CompleteTaskAsync(Guid id, Guid userId)
    {
        var task = await _db.UserTasks
            .FirstOrDefaultAsync(t => t.Id == id && t.AssignedToId == userId);
        if (task == null) return false;

        task.IsCompleted  = !task.IsCompleted; // toggle
        task.CompletedAt  = task.IsCompleted ? DateTime.UtcNow : null;
        task.UpdatedAt    = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteTaskAsync(Guid id, Guid userId)
    {
        var task = await _db.UserTasks
            .FirstOrDefaultAsync(t => t.Id == id && t.AssignedToId == userId);
        if (task == null) return false;
        _db.UserTasks.Remove(task);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<UserTaskDto>> GetTasksForMatterAsync(Guid matterId, Guid userId)
    {
        return await _db.UserTasks
            .Include(t => t.AssignedTo)
            .Include(t => t.AssignedBy)
            .Include(t => t.Matter)
            .Include(t => t.Reminders)
            .Where(t => t.MatterId == matterId && t.AssignedToId == userId)
            .OrderBy(t => t.IsCompleted)
            .ThenBy(t => t.DueDate)
            .Select(t => ToTaskDto(t))
            .ToListAsync();
    }

    public async Task<UserTaskDto?> GetTaskByIdAsync(Guid id)
    {
        var task = await _db.UserTasks
            .Include(t => t.AssignedTo)
            .Include(t => t.AssignedBy)
            .Include(t => t.Matter)
            .Include(t => t.Reminders)
            .FirstOrDefaultAsync(t => t.Id == id);
        return task == null ? null : ToTaskDto(task);
    }

    // ── Reminders ─────────────────────────────────────
    public async Task<ReminderDto> AddReminderToEventAsync(
        Guid eventId, CreateReminderRequest req, Guid userId)
    {
        var reminder = new Reminder
        {
            Id        = Guid.NewGuid(),
            Message   = req.Message,
            RemindAt  = DateTime.SpecifyKind(req.RemindAt, DateTimeKind.Utc),
            EventId   = eventId,
            UserId    = userId,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Reminders.Add(reminder);
        await _db.SaveChangesAsync();
        return new ReminderDto(reminder.Id, reminder.Message, reminder.RemindAt, false, null);
    }

    public async Task<ReminderDto> AddReminderToTaskAsync(
        Guid taskId, CreateReminderRequest req, Guid userId)
    {
        var reminder = new Reminder
        {
            Id        = Guid.NewGuid(),
            Message   = req.Message,
            RemindAt  = DateTime.SpecifyKind(req.RemindAt, DateTimeKind.Utc),
            TaskId    = taskId,
            UserId    = userId,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Reminders.Add(reminder);
        await _db.SaveChangesAsync();
        return new ReminderDto(reminder.Id, reminder.Message, reminder.RemindAt, false, null);
    }

    public async Task<bool> DeleteReminderAsync(Guid reminderId, Guid userId)
    {
        var r = await _db.Reminders.FirstOrDefaultAsync(r => r.Id == reminderId && r.UserId == userId);
        if (r == null) return false;
        _db.Reminders.Remove(r);
        await _db.SaveChangesAsync();
        return true;
    }

    // ── Notifications (unread reminders) ──────────────
    public async Task<int> GetUnreadCountAsync(Guid userId)
    {
        return await _db.Reminders
            .CountAsync(r => r.UserId == userId && r.SentEmail && r.ReadAt == null);
    }

    public async Task<List<ReminderDto>> GetNotificationsAsync(Guid userId)
    {
        return await _db.Reminders
            .Where(r => r.UserId == userId && r.SentEmail && r.ReadAt == null)
            .OrderByDescending(r => r.RemindAt)
            .Take(20)
            .Select(r => new ReminderDto(r.Id, r.Message, r.RemindAt, r.SentEmail, r.ReadAt))
            .ToListAsync();
    }

    public async Task MarkReadAsync(Guid reminderId, Guid userId)
    {
        var r = await _db.Reminders.FirstOrDefaultAsync(r => r.Id == reminderId && r.UserId == userId);
        if (r != null) { r.ReadAt = DateTime.UtcNow; await _db.SaveChangesAsync(); }
    }

    public async Task MarkAllReadAsync(Guid userId)
    {
        var unread = await _db.Reminders
            .Where(r => r.UserId == userId && r.ReadAt == null)
            .ToListAsync();
        foreach (var r in unread) r.ReadAt = DateTime.UtcNow;
        if (unread.Any()) await _db.SaveChangesAsync();
    }

    // ── Timeline for a matter ─────────────────────────
    public async Task<List<CalendarFeedItem>> GetMatterTimelineAsync(Guid matterId, Guid userId)
    {
        var events = await _db.CalendarEvents
            .Where(e => e.MatterId == matterId && e.CreatedById == userId)
            .ToListAsync();

        var tasks = await _db.UserTasks
            .Where(t => t.MatterId == matterId && t.AssignedToId == userId)
            .ToListAsync();

        var items = new List<CalendarFeedItem>();

        foreach (var e in events)
            items.Add(ToFeedItem(e, e.StartAt, e.EndAt));

        foreach (var t in tasks)
            items.Add(new CalendarFeedItem(
                $"task-{t.Id}", "Task", t.Title,
                null, null, null,
                t.DueDate, null, true, t.IsCompleted,
                t.Priority == "High" ? "#B91C1C" : t.Priority == "Normal" ? "#1A5C52" : "#888",
                t.Priority, t.MatterId, t.Id));

        return items.OrderByDescending(i => i.Date).ToList();
    }

    // ── Recurrence expansion ──────────────────────────
    private static List<(DateTime start, DateTime? end)> ExpandRecurrence(
        DomainCalendarEvent ev, DateTime windowStart, DateTime windowEnd)
    {
        try
        {
            var duration = ev.EndAt.HasValue ? ev.EndAt.Value - ev.StartAt : TimeSpan.Zero;
            var rruleText    = $"BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTSTART:{ev.StartAt:yyyyMMddTHHmmssZ}\r\nRRULE:{ev.RecurrenceRule}\r\nEND:VEVENT\r\nEND:VCALENDAR";
            var calendars = CalendarCollection.Load(rruleText);
            var component = calendars.SelectMany(c => c.Events).FirstOrDefault();
            if (component == null) return new();

            // TO:
        return component
        .GetOccurrences(new CalDateTime(windowEnd.Year, windowEnd.Month, windowEnd.Day))
        .Where(o => o.Period.StartTime.Value >= windowStart && 
               o.Period.StartTime.Value < windowEnd)
                
        .Select(o =>
        {
            var start = new DateTime(
                o.Period.StartTime.Year, o.Period.StartTime.Month, o.Period.StartTime.Day,
                o.Period.StartTime.Hour, o.Period.StartTime.Minute, o.Period.StartTime.Second,
                DateTimeKind.Utc);
            var end = duration > TimeSpan.Zero ? start + duration : (DateTime?)null;
            return (start, end);
        })
        
        .ToList();
        }
        catch
        {
            // Malformed RRULE — return the base event if it's in the window
            if (ev.StartAt >= windowStart && ev.StartAt < windowEnd)
                return new() { (ev.StartAt, ev.EndAt) };
            return new();
        }
    }

    // ── Helpers ───────────────────────────────────────
    private static CalendarFeedItem ToFeedItem(DomainCalendarEvent ev, DateTime start, DateTime? end) =>
        new($"event-{ev.Id}", "Event", ev.Title,
            null, ev.Matter?.Title, ev.Location,
            start, end, ev.IsAllDay, false,
            ev.Color ?? "#1A5C52", null, ev.MatterId, ev.Id);

    private static CalendarEventDto ToEventDto(DomainCalendarEvent ev) => new(
        ev.Id, ev.Title, ev.Description, ev.Location,
        ev.StartAt, ev.EndAt, ev.IsAllDay, ev.Color, ev.RecurrenceRule,
        ev.CreatedById, ev.CreatedBy?.FullName ?? "Unknown",
        ev.MatterId, ev.Matter?.Title,
        ev.Reminders?.Select(r => new ReminderDto(r.Id, r.Message, r.RemindAt, r.SentEmail, r.ReadAt)).ToList() ?? new(),
        ev.CreatedAt);

    private static UserTaskDto ToTaskDto(UserTask t) => new(
        t.Id, t.Title, t.Description, t.DueDate, t.Priority,
        t.IsCompleted, t.CompletedAt,
        t.AssignedToId, t.AssignedTo?.FullName ?? "Unknown",
        t.AssignedById, t.AssignedBy?.FullName,
        t.MatterId, t.Matter?.Title,
        t.Reminders?.Select(r => new ReminderDto(r.Id, r.Message, r.RemindAt, r.SentEmail, r.ReadAt)).ToList() ?? new(),
        t.CreatedAt);
}