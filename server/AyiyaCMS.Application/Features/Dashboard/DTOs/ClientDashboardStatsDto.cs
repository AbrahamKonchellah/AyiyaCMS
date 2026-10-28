// AyiyaCMS.Application/Features/Dashboard/DTOs/ClientDashboardStatsDto.cs
namespace AyiyaCMS.Application.Features.Dashboard.DTOs;

public class ClientDashboardStatsDto
{
    public int ActiveCases { get; set; }
    public int UpcomingHearings { get; set; }
    public int SharedDocuments { get; set; }
    public decimal OutstandingBalanceKes { get; set; }
}