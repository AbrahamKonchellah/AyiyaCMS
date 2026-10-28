// AyiyaCMS.Domain/Entities/CalendarEvent.cs
using System;

namespace AyiyaCMS.Domain.Entities
{
    public class CalendarEvent
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Location { get; set; }
        public DateTime StartAt { get; set; }
        public DateTime? EndAt { get; set; }
        public bool IsAllDay { get; set; } = false;
        public string? Color { get; set; }         
        public string? RecurrenceRule { get; set; } // iCal RRULE string

        public Guid CreatedById { get; set; }
        public User? CreatedBy { get; set; }

        public Guid? MatterId { get; set; }
        public Matter? Matter { get; set; }

        public ICollection<Reminder>? Reminders { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}