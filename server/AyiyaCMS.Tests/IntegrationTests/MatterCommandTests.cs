using AyiyaCMS.Application.Features.Matters.DTOs;
using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Features.Matters;
using AyiyaCMS.Infrastructure.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AyiyaCMS.Tests.IntegrationTests;

public class MatterCommandTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly MatterCommand _command;
    private readonly Mock<AuditService> _auditMock;

    public MatterCommandTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);

        _auditMock = new Mock<AuditService>(_db);
        _auditMock.Setup(a => a.WriteAsync(
            It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var accessService = new MatterAccessService(_db);
        _command = new MatterCommand(_db, _auditMock.Object);
    }

    public void Dispose() => _db.Dispose();

    private async Task<(Client client, User lawyer)> SeedBasicDataAsync()
    {
        var client = new Client
        {
            Id = Guid.NewGuid(), Name = "Test Client",
            Email = "client@test.com",
        };
        var lawyer = new User
        {
            Id = Guid.NewGuid(), FirstName = "Test", LastName = "Lawyer",
            Email = "lawyer@test.com", Role = "Associate", IsActive = true,
        };
        _db.Clients.Add(client);
        _db.Users.Add(lawyer);
        await _db.SaveChangesAsync();
        return (client, lawyer);
    }

    [Fact]
    public async Task CreateMatter_SavesCorrectly()
    {
        var (client, lawyer) = await SeedBasicDataAsync();

        var request = new CreateMatterRequest(
            Title:           "Test v Defendant",
            JICMSCaseNumber: "ELC/E/001/2026",
            CourtStation:    "Milimani Law Courts",
            ClientId:        client.Id,
            AssignedLawyerId: lawyer.Id,
            HearingDate:     null,
            FilingDeadline:  null
        );

        var result = await _command.CreateMatterAsync(request, "lawyer@test.com");

        result.Should().NotBeNull();
        result.Title.Should().Be("Test v Defendant");
        result.Status.Should().Be("Active");
        result.CourtStation.Should().Be("Milimani Law Courts");
    }

    [Fact]
    public async Task ChangeStatus_UpdatesCorrectly()
    {
        var (client, lawyer) = await SeedBasicDataAsync();

        var matter = new Matter
        {
            Id       = Guid.NewGuid(),
            Title    = "Status Test Matter",
            ClientId = client.Id,
            Status   = "Active",
        };
        _db.Matters.Add(matter);
        await _db.SaveChangesAsync();

        var result = await _command.ChangeStatusAsync(
            matter.Id, "Closed", "lawyer@test.com");

        result.Should().BeTrue();

        var updated = await _db.Matters.FindAsync(matter.Id);
        updated!.Status.Should().Be("Closed");
    }

    [Fact]
    public async Task GetMattersAsync_Associate_OnlySeesAssignedMatters()
    {
        var (client, lawyer) = await SeedBasicDataAsync();
        var otherId = Guid.NewGuid();

        _db.Matters.AddRange(
            new Matter
            {
                Id = Guid.NewGuid(), Title = "Assigned Matter",
                ClientId = client.Id, Status = "Active",
                AssignedLawyerId = lawyer.Id,
            },
            new Matter
            {
                Id = Guid.NewGuid(), Title = "Other Matter",
                ClientId = client.Id, Status = "Active",
                AssignedLawyerId = otherId,
            }
        );
        await _db.SaveChangesAsync();

        var matters = await _command.GetMattersAsync(lawyer.Id, "Associate");

        matters.Should().HaveCount(1);
        matters[0].Title.Should().Be("Assigned Matter");
    }

    [Fact]
    public async Task GetMattersAsync_Partner_SeesAllMatters()
    {
        var (client, lawyer) = await SeedBasicDataAsync();

        _db.Matters.AddRange(
            new Matter
            {
                Id = Guid.NewGuid(), Title = "Matter A",
                ClientId = client.Id, Status = "Active",
                AssignedLawyerId = lawyer.Id,
            },
            new Matter
            {
                Id = Guid.NewGuid(), Title = "Matter B",
                ClientId = client.Id, Status = "Active",
                AssignedLawyerId = Guid.NewGuid(),
            }
        );
        await _db.SaveChangesAsync();

        var matters = await _command.GetMattersAsync(lawyer.Id, "Partner");

        matters.Should().HaveCount(2);
    }

    [Fact]
    public async Task DeleteMatter_RemovesFromDb()
    {
        var (client, _) = await SeedBasicDataAsync();

        var matter = new Matter
        {
            Id = Guid.NewGuid(), Title = "To Delete",
            ClientId = client.Id, Status = "Active",
        };
        _db.Matters.Add(matter);
        await _db.SaveChangesAsync();

        var result = await _command.DeleteMatterAsync(matter.Id, "admin@test.com");

        result.Should().BeTrue();
        var deleted = await _db.Matters.FindAsync(matter.Id);
        deleted.Should().BeNull();
    }
}
