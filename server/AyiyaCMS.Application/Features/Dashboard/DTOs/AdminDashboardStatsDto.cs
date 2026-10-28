// AyiyaCMS.Application/Features/Dashboard/DTOs/AdminDashboardStatsDto.cs
namespace AyiyaCMS.Application.Features.Dashboard.DTOs;

public class AdminDashboardStatsDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int TotalClients { get; set; }
    public int ActiveMatters { get; set; }
    public int TotalDocuments { get; set; }
    public Dictionary<string, int> UsersByRole { get; set; } = new();
}