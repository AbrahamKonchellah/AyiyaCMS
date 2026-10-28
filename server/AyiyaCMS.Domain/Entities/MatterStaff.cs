// AyiyaCMS.Domain.Entities/MatterStaff.cs
namespace AyiyaCMS.Domain.Entities;

public class MatterStaff
{
    public Guid MatterId { get; set; }
    public Matter? Matter { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string Role { get; set; } = string.Empty; // e.g. "Paralegal", "Associate", "Secretary"
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}