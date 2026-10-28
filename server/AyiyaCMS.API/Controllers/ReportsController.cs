// AyiyaCMS.API/Controllers/ReportsController.cs
using AyiyaCMS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Policy = "PartnerOrAdmin")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ReportsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetReports()
    {
        // Case performance
        var allMatters = await _db.Matters.ToListAsync();
        var active = allMatters.Count(m => m.Status == "Active");
        var closed = allMatters.Count(m => m.Status == "Closed");
        var avgDaysToClose = allMatters
            .Where(m => m.Status == "Closed")
            .Select(m => (m.UpdatedAt - m.CreatedAt).TotalDays)
            .DefaultIfEmpty(0)
            .Average();

        // Lawyer productivity
        var productivity = await _db.TimeEntries
            .Include(t => t.User)
            .GroupBy(t => new { t.UserId, t.User!.FirstName, t.User.LastName })
            .Select(g => new
            {
                userId = g.Key.UserId,
                name = g.Key.FirstName + " " + g.Key.LastName,
                totalHours = g.Sum(t => t.Hours),
                billedHours = g.Where(t => t.IsBilled).Sum(t => t.Hours),
                totalAmount = g.Sum(t => t.Hours * t.Rate),
            })
            .OrderByDescending(p => p.totalHours)
            .ToListAsync();

        // Financial summary
        var invoices = await _db.Invoices.ToListAsync();
        var totalInvoiced  = invoices.Sum(i => i.Amount);
        var totalCollected = invoices.Where(i => i.Status == "Paid").Sum(i => i.Amount);
        var totalOutstanding = invoices.Where(i => i.Status is "Pending" or "Sent" or "Overdue").Sum(i => i.Amount);

        var monthlyTrend = invoices
            .Where(i => i.IssuedAt >= DateTime.UtcNow.AddMonths(-6))
            .GroupBy(i => new { i.IssuedAt.Year, i.IssuedAt.Month })
            .Select(g => new
            {
                year = g.Key.Year,
                month = g.Key.Month,
                invoiced  = g.Sum(i => i.Amount),
                collected = g.Where(i => i.Status == "Paid").Sum(i => i.Amount),
            })
            .OrderBy(m => m.year).ThenBy(m => m.month)
            .ToList();

        // Client activity
        var clientActivity = await _db.Clients
            .Include(c => c.Matters)
            .Select(c => new
            {
                clientId = c.Id,
                clientName = c.Name,
                matterCount = c.Matters!.Count(),
                activeMatters = c.Matters!.Count(m => m.Status == "Active"),
                lastUpdated = c.Matters!.Max(m => (DateTime?)m.UpdatedAt),
            })
            .OrderByDescending(c => c.activeMatters)
            .ToListAsync();

        return Ok(new
        {
            casePerformance = new { active, closed, avgDaysToClose },
            productivity,
            financial = new { totalInvoiced, totalCollected, totalOutstanding, monthlyTrend },
            clientActivity,
        });
    }
}