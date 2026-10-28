using AyiyaCMS.Infrastructure.Configuration;
using AyiyaCMS.Infrastructure.Features.Billing;
using FluentAssertions;
namespace AyiyaCMS.Tests.UnitTests;

public class FeeNotePdfGeneratorTests
{
    [Fact]
    public void Generate_ProducesValidPdfBytes()
    {
        var firm = new FirmSettings
        {
            Name = "Test Advocates LLP",
            Address = "Nairobi, Kenya",
            Phone = "0700000000",
            Email = "info@testadvocates.co.ke",
            VatPin = "P000111222Z",
        };

        var lineItems = new List<FeeNoteLineItem>
        {
            new() { Date = DateTime.UtcNow, Description = "Legal research", Hours = 2m, Rate = 5000m, Amount = 10000m },
        };

        var bytes = FeeNotePdfGenerator.Generate(
            firm, "FN-2026-0001", DateTime.UtcNow,
            "Test Matter", "ELC/E/001/2026",
            "Test Client", "P.O. Box 123, Nairobi",
            lineItems, 10000m, 1600m, 11600m, 0.16m,
            "Test Advocate");

        bytes.Should().NotBeNull();
        bytes.Length.Should().BeGreaterThan(0);
        System.Text.Encoding.ASCII.GetString(bytes, 0, 4).Should().Be("%PDF");
    }
}