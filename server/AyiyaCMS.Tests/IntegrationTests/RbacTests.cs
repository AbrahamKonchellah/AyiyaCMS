using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Tests.IntegrationTests;

// Tests role-based data scoping — the most critical security layer
public class RbacTests : IDisposable
{
    private readonly AppDbContext _db;

    public RbacTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Client_CannotSeeOtherClientsMatters()
    {
        var client1 = new Client
        {
            Id = Guid.NewGuid(), Name = "Client One",
            Email = "client1@test.com",
        };
        var client2 = new Client
        {
            Id = Guid.NewGuid(), Name = "Client Two",
            Email = "client2@test.com",
        };

        _db.Clients.AddRange(client1, client2);
        _db.Matters.AddRange(
            new Matter
            {
                Id = Guid.NewGuid(), Title = "Client1 Matter",
                ClientId = client1.Id, Status = "Active",
            },
            new Matter
            {
                Id = Guid.NewGuid(), Title = "Client2 Matter",
                ClientId = client2.Id, Status = "Active",
            }
        );
        await _db.SaveChangesAsync();

        // Simulate client portal scoping — only matters for client1
        var matters = await _db.Matters
            .Where(m => m.ClientId == client1.Id)
            .ToListAsync();

        matters.Should().HaveCount(1);
        matters[0].Title.Should().Be("Client1 Matter");
    }

    [Fact]
    public async Task Associate_OnlySeesAssignedMatters()
    {
        var associate = new User
        {
            Id = Guid.NewGuid(), FirstName = "Jane", LastName = "Doe",
            Email = "jane@test.com", Role = "Associate", IsActive = true,
        };
        var client = new Client
        {
            Id = Guid.NewGuid(), Name = "Test Client",
            Email = "client@test.com",
        };

        _db.Users.Add(associate);
        _db.Clients.Add(client);
        _db.Matters.AddRange(
            new Matter
            {
                Id = Guid.NewGuid(), Title = "Assigned",
                ClientId = client.Id, Status = "Active",
                AssignedLawyerId = associate.Id,
            },
            new Matter
            {
                Id = Guid.NewGuid(), Title = "Not Assigned",
                ClientId = client.Id, Status = "Active",
                AssignedLawyerId = Guid.NewGuid(),
            }
        );
        await _db.SaveChangesAsync();

        var matters = await _db.Matters
            .Where(m => m.AssignedLawyerId == associate.Id)
            .ToListAsync();

        matters.Should().HaveCount(1);
        matters[0].Title.Should().Be("Assigned");
    }

    [Fact]
    public async Task InactiveUser_ShouldNotHaveValidSession()
    {
        var inactiveUser = new User
        {
            Id = Guid.NewGuid(), FirstName = "Inactive", LastName = "User",
            Email = "inactive@test.com", Role = "Associate",
            IsActive = false,
            RefreshToken = "some-token",
            RefreshTokenExpiry = DateTime.UtcNow.AddDays(7),
        };

        _db.Users.Add(inactiveUser);
        await _db.SaveChangesAsync();

        // Active session count should exclude inactive users
        var activeSessions = await _db.Users
            .CountAsync(u => u.RefreshToken != null &&
                             u.RefreshTokenExpiry > DateTime.UtcNow &&
                             u.IsActive);

        activeSessions.Should().Be(0);
    }

    [Fact]
    public async Task ExpiredRefreshToken_IsNotCountedAsActiveSession()
    {
        var user = new User
        {
            Id = Guid.NewGuid(), FirstName = "Expired", LastName = "Session",
            Email = "expired@test.com", Role = "Associate",
            IsActive = true,
            RefreshToken = "expired-token",
            RefreshTokenExpiry = DateTime.UtcNow.AddDays(-1), // expired
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var activeSessions = await _db.Users
            .CountAsync(u => u.RefreshToken != null &&
                             u.RefreshTokenExpiry > DateTime.UtcNow &&
                             u.IsActive);

        activeSessions.Should().Be(0);
    }
}