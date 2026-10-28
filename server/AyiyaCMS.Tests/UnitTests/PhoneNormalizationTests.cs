using AyiyaCMS.Infrastructure.Services;
using FluentAssertions;

namespace AyiyaCMS.Tests.UnitTests;

public class PhoneNormalizationTests
{
    // We test the private method via reflection since it's a pure function
    // worth verifying directly given its importance to SMS delivery
    private static string? Normalize(string phone)
    {
        var method = typeof(AfricasTalkingSmsService)
            .GetMethod("NormalizePhone",
                System.Reflection.BindingFlags.NonPublic |
                System.Reflection.BindingFlags.Static);
        return (string?)method!.Invoke(null, [phone]);
    }

    [Theory]
    [InlineData("0712345678",   "+254712345678")]
    [InlineData("254712345678", "+254712345678")]
    [InlineData("712345678",    "+254712345678")]
    [InlineData("0712 345 678", "+254712345678")]
    public void NormalizePhone_ValidInputs_ReturnsE164(string input, string expected)
    {
        var result = Normalize(input);
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("123")]
    [InlineData("")]
    [InlineData("abcdefghij")]
    public void NormalizePhone_InvalidInputs_ReturnsNull(string input)
    {
        var result = Normalize(input);
        result.Should().BeNull();
    }
}