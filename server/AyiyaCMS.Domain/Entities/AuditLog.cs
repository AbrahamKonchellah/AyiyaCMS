using System;

namespace AyiyaCMS.Domain.Entities
{
    public class AuditLog
    {
        public Guid Id { get; set; }
        public string EntityName { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string PerformedBy { get; set; } = string.Empty;
        public DateTime PerformedAt { get; set; } = DateTime.UtcNow;
        public string Changes { get; set; } = string.Empty;
    }
}
