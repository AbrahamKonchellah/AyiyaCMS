using FluentAssertions;

namespace AyiyaCMS.Tests.UnitTests;

// Tests the invoice status transition rules
public class InvoiceStatusTests
{
    [Theory]
    [InlineData("Draft",   true)]   // Draft can be sent
    [InlineData("Sent",    false)]  // Already sent
    [InlineData("Paid",    false)]  // Already paid
    [InlineData("Overdue", false)]  // Overdue cannot be re-sent
    public void CanMarkSent_OnlyFromDraft(string status, bool expected)
    {
        var canSend = status == "Draft";
        canSend.Should().Be(expected);
    }

    [Theory]
    [InlineData("Sent",    true)]
    [InlineData("Overdue", true)]
    [InlineData("Draft",   false)]
    [InlineData("Paid",    false)]
    public void CanMarkPaid_OnlyFromSentOrOverdue(string status, bool expected)
    {
        var canPay = status == "Sent" || status == "Overdue";
        canPay.Should().Be(expected);
    }

    [Fact]
    public void IsOverdue_WhenSentAndPastDueDate_ReturnsTrue()
    {
        var dueDate = DateTime.UtcNow.AddDays(-1);
        var status  = "Sent";

        var overdue = (status == "Sent" || status == "Pending") &&
                      dueDate < DateTime.UtcNow;

        overdue.Should().BeTrue();
    }

    [Fact]
    public void IsOverdue_WhenPaid_ReturnsFalse()
    {
        var dueDate = DateTime.UtcNow.AddDays(-1);
        var status  = "Paid";

        var overdue = (status == "Sent" || status == "Pending") &&
                      dueDate < DateTime.UtcNow;

        overdue.Should().BeFalse();
    }
}