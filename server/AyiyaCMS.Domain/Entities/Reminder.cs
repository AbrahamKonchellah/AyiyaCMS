// AyiyaCMS.Domain/Entities/Reminder.cs
using System;

namespace AyiyaCMS.Domain.Entities
{
    public class Reminder
    {
        public Guid Id { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime RemindAt { get; set; }

        // Exactly one of these will be set
        public Guid? EventId { get; set; }
        public CalendarEvent? Event { get; set; }

        public Guid? TaskId { get; set; }
        public UserTask? Task { get; set; }

        public Guid UserId { get; set; }
        public User? User { get; set; }

        public bool SentEmail { get; set; } = false;
        public DateTime? ReadAt { get; set; }    // null = unread in-app

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}