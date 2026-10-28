// AyiyaCMS.Domain/Entities/UserTask.cs
using System;

namespace AyiyaCMS.Domain.Entities
{
    public class UserTask
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime DueDate { get; set; }
        public string Priority { get; set; } = "Normal"; // Low, Normal, High
        public bool IsCompleted { get; set; } = false;
        public DateTime? CompletedAt { get; set; }

        public Guid AssignedToId { get; set; }
        public User? AssignedTo { get; set; }

        public Guid? AssignedById { get; set; }   // set when a Partner delegates
        public User? AssignedBy { get; set; }

        public Guid? MatterId { get; set; }
        public Matter? Matter { get; set; }

        public ICollection<Reminder>? Reminders { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}