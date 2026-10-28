// AyiyaCMS.Domain/Entities/FeeNote.cs
using System;

namespace AyiyaCMS.Domain.Entities
{
    public class FeeNote
    {
        public Guid Id { get; set; }
        public Guid MatterId { get; set; }
        public Matter? Matter { get; set; }
        public string FeeNoteNumber { get; set; } = string.Empty;
        public decimal Subtotal { get; set; }
        public decimal VatAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "PendingApproval"; // PendingApproval, Approved
        public Guid GeneratedById { get; set; }
        public User? GeneratedBy { get; set; }
        public Guid? ApprovedById { get; set; }
        public User? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string FileKey { get; set; } = string.Empty;
        public string BucketName { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }
}