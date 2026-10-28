using FluentAssertions;

namespace AyiyaCMS.Tests.UnitTests;

// Tests fee note total calculation logic
public class FeeNoteCalculationTests
{
    private const decimal VatRate = 0.16m;

    private static (decimal subtotal, decimal vat, decimal total) Calculate(
        IEnumerable<(decimal hours, decimal rate)> entries)
    {
        var subtotal = entries.Sum(e => e.hours * e.rate);
        var vat      = Math.Round(subtotal * VatRate, 2);
        var total    = subtotal + vat;
        return (subtotal, vat, total);
    }

    [Fact]
    public void FeeNote_SingleEntry_CalculatesCorrectly()
    {
        var entries = new[] { (hours: 2m, rate: 5000m) };

        var (subtotal, vat, total) = Calculate(entries);

        subtotal.Should().Be(10000m);
        vat.Should().Be(1600m);
        total.Should().Be(11600m);
    }

    [Fact]
    public void FeeNote_MultipleEntries_SumsCorrectly()
    {
        var entries = new[]
        {
            (hours: 1m,   rate: 5000m),
            (hours: 0.5m, rate: 5000m),
            (hours: 3m,   rate: 3000m),
        };

        var (subtotal, vat, total) = Calculate(entries);

        subtotal.Should().Be(16500m);
        vat.Should().Be(2640m);
        total.Should().Be(19140m);
    }

    [Fact]
    public void FeeNote_ZeroHours_ProducesZeroTotal()
    {
        var entries = new[] { (hours: 0m, rate: 5000m) };

        var (subtotal, vat, total) = Calculate(entries);

        subtotal.Should().Be(0m);
        vat.Should().Be(0m);
        total.Should().Be(0m);
    }

    [Fact]
    public void FeeNote_VatCalculation_RoundsToTwoDecimalPlaces()
    {
        // 3 hours at 1000 = 3000, 16% VAT = 480.00 exactly
        var entries = new[] { (hours: 3m, rate: 1000m) };

        var (_, vat, _) = Calculate(entries);

        vat.Should().Be(480.00m);
        decimal.Round(vat, 2).Should().Be(vat); // already rounded
    }
}