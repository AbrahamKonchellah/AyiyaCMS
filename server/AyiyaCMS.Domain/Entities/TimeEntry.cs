using System;

namespace AyiyaCMS.Domain.Entities
{
    public class TimeEntry
    {
        public Guid Id { get; set; }
        public Guid MatterId { get; set; }
        public Matter? Matter { get; set; }
        public Guid UserId { get; set; }
        public User? User { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Hours { get; set; }
        public decimal Rate { get; set; }
        public bool IsBilled { get; set; } = false;
        public DateTime EntryDate { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Guid? FeeNoteId { get; set; }
        public FeeNote? FeeNote { get; set; }
    }
}