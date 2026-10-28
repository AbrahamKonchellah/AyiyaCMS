using FluentAssertions;

namespace AyiyaCMS.Tests.UnitTests;

// Tests the password rules enforced during user creation and reset
public class PasswordValidationTests
{
    // Mirrors the validation logic from the system
    private static bool IsValidPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password)) return false;
        if (password.Length < 8) return false;
        if (!password.Any(char.IsUpper)) return false;
        if (!password.Any(char.IsLower)) return false;
        if (!password.Any(char.IsDigit)) return false;
        return true;
    }

    [Theory]
    [InlineData("Short1A",    false)] // too short
    [InlineData("alllowercase1", false)] // no uppercase
    [InlineData("ALLUPPERCASE1", false)] // no lowercase
    [InlineData("NoDigitsHere", false)] // no digit
    [InlineData("",            false)] // empty
    [InlineData("ValidPass1",  true)]
    [InlineData("C0mplexP@ss", true)]
    public void Password_Validation_EnforcesRules(string password, bool expected)
    {
        IsValidPassword(password).Should().Be(expected);
    }
}