using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace AyiyaCMS.Tests.IntegrationTests;

public class DeadlineReminderJobTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Mock<IEmailService> _emailMock;
    private readonly Mock<ISmsService> _smsMock;
    private readonly Mock<AuditService> _auditMock;

    public DeadlineReminderJobTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);

        _emailMock = new Mock<IEmailService>();
        _emailMock.Setup(e => e.SendEmailAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        _smsMock = new Mock<ISmsService>();
        _smsMock.Setup(s => s.SendSmsAsync(
            It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        _auditMock = new Mock<AuditService>(_db);
        _auditMock.Setup(a => a.WriteAsync(
            It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<string>()))
            .Returns(Task.CompletedTask);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task ReminderJob_FindsMatterWithHearingIn7Days()
    {
        var lawyer = new User
        {
            Id = Guid.NewGuid(), FirstName = "John", LastName = "Advocate",
            Email = "john@firm.co.ke", Role = "Associate",
            IsActive = true, Phone = "0712345678",
        };
        var client = new Client
        {
            Id = Guid.NewGuid(), Name = "Test Client",
            Email = "client@test.com",
        };
        var matter = new Matter
        {
            Id               = Guid.NewGuid(),
            Title            = "Upcoming Hearing",
            Status           = "Active",
            ClientId         = client.Id,
            AssignedLawyerId = lawyer.Id,
            HearingDate      = DateTime.UtcNow.Date.AddDays(7),
            CourtStation     = "Milimani",
        };

        _db.Users.Add(lawyer);
        _db.Clients.Add(client);
        _db.Matters.Add(matter);
        await _db.SaveChangesAsync();

        var now         = DateTime.UtcNow.Date;
        var targetDates = new[] { 1, 3, 7 }
            .Select(d => now.AddDays(d)).ToHashSet();

        var found = await _db.Matters
            .Include(m => m.Client)
            .Include(m => m.AssignedLawyer)
            .Where(m => m.Status == "Active" && (
                (m.HearingDate.HasValue &&
                 targetDates.Contains(m.HearingDate.Value.Date)) ||
                (m.FilingDeadline.HasValue &&
                 targetDates.Contains(m.FilingDeadline.Value.Date))
            ))
            .ToListAsync();

        found.Should().HaveCount(1);
        found[0].Title.Should().Be("Upcoming Hearing");
    }

    [Fact]
    public async Task ReminderJob_DoesNotFindMattersOutsideCheckWindow()
    {
        var matter = new Matter
        {
            Id          = Guid.NewGuid(),
            Title       = "Far Future Hearing",
            Status      = "Active",
            HearingDate = DateTime.UtcNow.Date.AddDays(14), // not 1, 3, or 7
        };

        _db.Matters.Add(matter);
        await _db.SaveChangesAsync();

        var now         = DateTime.UtcNow.Date;
        var targetDates = new[] { 1, 3, 7 }
            .Select(d => now.AddDays(d)).ToHashSet();

        var found = await _db.Matters
            .Where(m => m.Status == "Active" &&
                        m.HearingDate.HasValue &&
                        targetDates.Contains(m.HearingDate.Value.Date))
            .ToListAsync();

        found.Should().BeEmpty();
    }

    [Fact]
    public async Task ReminderJob_DoesNotFindClosedMatters()
    {
        var matter = new Matter
        {
            Id          = Guid.NewGuid(),
            Title       = "Closed Matter",
            Status      = "Closed",
            HearingDate = DateTime.UtcNow.Date.AddDays(1),
        };

        _db.Matters.Add(matter);
        await _db.SaveChangesAsync();

        var now         = DateTime.UtcNow.Date;
        var targetDates = new[] { 1, 3, 7 }
            .Select(d => now.AddDays(d)).ToHashSet();

        var found = await _db.Matters
            .Where(m => m.Status == "Active" &&
                        m.HearingDate.HasValue &&
                        targetDates.Contains(m.HearingDate.Value.Date))
            .ToListAsync();

        found.Should().BeEmpty();
    }
}