// AyiyaCMS.Application/Features/Dashboard/DTOs/DashboardStatsDto.cs
namespace AyiyaCMS.Application.Features.Dashboard.DTOs;

public class DashboardStatsDto
{
    public int ActiveMatters { get; set; }
    public int UpcomingHearings { get; set; }
    public decimal OutstandingInvoiceKes { get; set; }
    public decimal UnbilledHoursThisMonth { get; set; }
}