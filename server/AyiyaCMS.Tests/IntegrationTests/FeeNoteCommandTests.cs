using Amazon.S3;
using Amazon.S3.Model;
using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Configuration;
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Features.Billing;
using AyiyaCMS.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using FluentAssertions;
using Moq;

namespace AyiyaCMS.Tests.IntegrationTests;

public class FeeNoteCommandTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly FeeNoteCommand _command;
    private readonly Mock<IAmazonS3> _s3Mock = new();

    public FeeNoteCommandTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);

        _s3Mock.Setup(s => s.PutObjectAsync(It.IsAny<PutObjectRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PutObjectResponse());

        var storage = new S3StorageService(_s3Mock.Object, "test-bucket");
        var config = new ConfigurationBuilder().Build();
        var firm = Options.Create(new FirmSettings
        {
            Name = "Test Advocates LLP",
            Address = "Nairobi, Kenya",
            Phone = "0700000000",
            Email = "info@testadvocates.co.ke",
            VatPin = "P000111222Z",
            VatRate = 0.16m,
        });

        _command = new FeeNoteCommand(_db, storage, config, firm);
    }

    public void Dispose() => _db.Dispose();

    private async Task<(Matter matter, User lawyer)> SeedMatterWithTimeEntriesAsync(params (decimal hours, decimal rate)[] entries)
    {
        var client = new Client { Id = Guid.NewGuid(), Name = "Test Client", Email = "c@test.com" };
        var lawyer = new User
        {
            Id = Guid.NewGuid(), FirstName = "Test", LastName = "Lawyer",
            Email = "lawyer@test.com", Role = "Associate", IsActive = true,
        };
        var matter = new Matter
        {
            Id = Guid.NewGuid(), Title = "Test Matter", ClientId = client.Id,
            Status = "Active", JICMSCaseNumber = "ELC/E/001/2026",
        };

        _db.Clients.Add(client);
        _db.Users.Add(lawyer);
        _db.Matters.Add(matter);

        foreach (var (hours, rate) in entries)
        {
            _db.TimeEntries.Add(new TimeEntry
            {
                Id = Guid.NewGuid(),
                MatterId = matter.Id,
                EntryDate = DateTime.UtcNow,
                Description = "Legal research",
                Hours = hours,
                Rate = rate,
                IsBilled = false,
            });
        }

        await _db.SaveChangesAsync();
        return (matter, lawyer);
    }

    [Fact]
    public async Task GenerateAsync_CalculatesCorrectSubtotalVatAndTotal()
    {
        var (matter, lawyer) = await SeedMatterWithTimeEntriesAsync((2m, 5000m), (1m, 3000m));

        var (success, error, feeNote) = await _command.GenerateAsync(matter.Id, lawyer.Id);

        success.Should().BeTrue();
        error.Should().BeNull();
        feeNote!.Subtotal.Should().Be(13000m);
        feeNote.VatAmount.Should().Be(2080m);
        feeNote.TotalAmount.Should().Be(15080m);
    }

    [Fact]
    public async Task GenerateAsync_NoUnbilledEntries_ReturnsError()
    {
        var (matter, lawyer) = await SeedMatterWithTimeEntriesAsync();

        var (success, error, feeNote) = await _command.GenerateAsync(matter.Id, lawyer.Id);

        success.Should().BeFalse();
        error.Should().Contain("No unbilled");
        feeNote.Should().BeNull();
    }

    [Fact]
    public async Task GenerateAsync_MarksTimeEntriesBilledAndLinksFeeNote()
    {
        var (matter, lawyer) = await SeedMatterWithTimeEntriesAsync((3m, 4000m));

        var (success, _, feeNote) = await _command.GenerateAsync(matter.Id, lawyer.Id);

        success.Should().BeTrue();
        var entries = await _db.TimeEntries.Where(t => t.MatterId == matter.Id).ToListAsync();
        entries.Should().OnlyContain(t => t.IsBilled && t.FeeNoteId == feeNote!.Id);
    }

    [Fact]
    public async Task GenerateAsync_ProducesSequentialFeeNoteNumbers()
    {
        var (matterA, lawyer) = await SeedMatterWithTimeEntriesAsync((1m, 1000m));
        var (_, error1, feeNoteA) = await _command.GenerateAsync(matterA.Id, lawyer.Id);

        var client2 = new Client { Id = Guid.NewGuid(), Name = "Client 2", Email = "c2@test.com" };
        var matterB = new Matter { Id = Guid.NewGuid(), Title = "Matter B", ClientId = client2.Id, Status = "Active" };
        _db.Clients.Add(client2);
        _db.Matters.Add(matterB);
        _db.TimeEntries.Add(new TimeEntry
        {
            Id = Guid.NewGuid(), MatterId = matterB.Id, EntryDate = DateTime.UtcNow,
            Description = "Drafting", Hours = 2m, Rate = 2000m, IsBilled = false,
        });
        await _db.SaveChangesAsync();

        var (_, error2, feeNoteB) = await _command.GenerateAsync(matterB.Id, lawyer.Id);

        error1.Should().BeNull();
        error2.Should().BeNull();
        var year = DateTime.UtcNow.Year;
        feeNoteA!.FeeNoteNumber.Should().Be($"FN-{year}-0001");
        feeNoteB!.FeeNoteNumber.Should().Be($"FN-{year}-0002");
    }

    [Fact]
    public async Task ApproveAsync_ApprovesPendingFeeNote()
    {
        var (matter, lawyer) = await SeedMatterWithTimeEntriesAsync((1m, 5000m));
        var (_, _, feeNote) = await _command.GenerateAsync(matter.Id, lawyer.Id);

        var approved = await _command.ApproveAsync(feeNote!.Id, lawyer.Id);

        approved.Should().BeTrue();
        var stored = await _db.FeeNotes.FindAsync(feeNote.Id);
        stored!.Status.Should().Be("Approved");
        stored.ApprovedById.Should().Be(lawyer.Id);
    }

    [Fact]
    public async Task ApproveAsync_AlreadyApproved_ReturnsFalse()
    {
        var (matter, lawyer) = await SeedMatterWithTimeEntriesAsync((1m, 5000m));
        var (_, _, feeNote) = await _command.GenerateAsync(matter.Id, lawyer.Id);
        await _command.ApproveAsync(feeNote!.Id, lawyer.Id);

        var secondAttempt = await _command.ApproveAsync(feeNote.Id, lawyer.Id);

        secondAttempt.Should().BeFalse();
    }
}