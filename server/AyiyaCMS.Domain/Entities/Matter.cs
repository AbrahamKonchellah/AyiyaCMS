// AyiyaCMS.Domain.Entities/Matter.cs
using System;
using System.Collections.Generic;

namespace AyiyaCMS.Domain.Entities
{
    public class Matter
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string JICMSCaseNumber { get; set; } = string.Empty;
        public string CourtStation { get; set; } = string.Empty;
        public DateTime? HearingDate { get; set; }
        public DateTime? FilingDeadline { get; set; }
        public string Status { get; set; } = "Active";

        // Client relationship
        public Guid ClientId { get; set; }
        public Client? Client { get; set; }

        // Primary assigned lawyer (Partner or Associate)
        public Guid? AssignedLawyerId { get; set; }
        public User? AssignedLawyer { get; set; }

        // Additional staff (Paralegals, Associates, Secretaries)
        public ICollection<MatterStaff> Staff { get; set; } = new List<MatterStaff>();

        public ICollection<Document>? Documents { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<TimeEntry>? TimeEntries { get; set; }
        public ICollection<FeeNote>? FeeNotes { get; set; }
        public ICollection<CalendarEvent>? CalendarEvents { get; set; }
        public ICollection<UserTask>? Tasks { get; set; }
        public ICollection<MatterNote>? Notes { get; set; }
    }
}