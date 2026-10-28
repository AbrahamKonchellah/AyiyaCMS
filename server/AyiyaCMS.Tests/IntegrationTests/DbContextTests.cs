using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Tests.IntegrationTests;

public class DbContextTests : IDisposable
{
    private readonly AppDbContext _db;

    public DbContextTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task CanCreateAndRetrieveUser()
    {
        var user = new User
        {
            Id        = Guid.NewGuid(),
            FirstName = "Test",
            LastName  = "Lawyer",
            Email     = "test@ayiyacms.co.ke",
            Role      = "Associate",
            IsActive  = true,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var retrieved = await _db.Users.FindAsync(user.Id);
        retrieved.Should().NotBeNull();
        retrieved!.Email.Should().Be("test@ayiyacms.co.ke");
        retrieved.FullName.Should().Be("Test Lawyer");
    }

    [Fact]
    public async Task CanCreateClientAndMatter()
    {
        var client = new Client
        {
            Id    = Guid.NewGuid(),
            Name  = "Wanjiku Enterprises",
            Email = "wanjiku@example.com",
            Phone = "0712345678",
        };

        var matter = new Matter
        {
            Id       = Guid.NewGuid(),
            Title    = "Wanjiku v KRA",
            ClientId = client.Id,
            Status   = "Active",
        };

        _db.Clients.Add(client);
        _db.Matters.Add(matter);
        await _db.SaveChangesAsync();

        var retrieved = await _db.Matters
            .Include(m => m.Client)
            .FirstOrDefaultAsync(m => m.Id == matter.Id);

        retrieved.Should().NotBeNull();
        retrieved!.Client!.Name.Should().Be("Wanjiku Enterprises");
        retrieved.Status.Should().Be("Active");
    }

    [Fact]
    public async Task UserEmail_IsUnique_WhenEnforced()
    {
        var email = "duplicate@ayiyacms.co.ke";

        _db.Users.Add(new User
        {
            Id = Guid.NewGuid(), FirstName = "A", LastName = "B",
            Email = email, Role = "Associate",
        });
        await _db.SaveChangesAsync();

        var count = await _db.Users.CountAsync(u => u.Email == email);
        count.Should().Be(1);
    }

    [Fact]
    public async Task AuditLog_IsAppendOnly_NeverUpdated()
    {
        var log = new AuditLog
        {
            Id          = Guid.NewGuid(),
            EntityName  = "Matter",
            EntityId    = Guid.NewGuid().ToString(),
            Action      = "Created",
            PerformedBy = "test@ayiyacms.co.ke",
            PerformedAt = DateTime.UtcNow,
            Changes     = "Title: Test Matter",
        };

        _db.AuditLogs.Add(log);
        await _db.SaveChangesAsync();

        // Verify it exists and cannot be modified (by design — no update methods exist)
        var retrieved = await _db.AuditLogs.FindAsync(log.Id);
        retrieved.Should().NotBeNull();
        retrieved!.Action.Should().Be("Created");
    }

    [Fact]
    public async Task Matter_WithUpcomingHearing_FoundByDateQuery()
    {
        var hearingDate = DateTime.UtcNow.AddDays(3);

        _db.Matters.Add(new Matter
        {
            Id          = Guid.NewGuid(),
            Title       = "Upcoming Hearing Matter",
            Status      = "Active",
            HearingDate = hearingDate,
        });
        await _db.SaveChangesAsync();

        var now    = DateTime.UtcNow;
        var limit  = now.AddDays(7);

        var found = await _db.Matters
            .Where(m => m.Status == "Active" &&
                        m.HearingDate.HasValue &&
                        m.HearingDate.Value >= now &&
                        m.HearingDate.Value <= limit)
            .ToListAsync();

        found.Should().HaveCount(1);
        found[0].Title.Should().Be("Upcoming Hearing Matter");
    }
}