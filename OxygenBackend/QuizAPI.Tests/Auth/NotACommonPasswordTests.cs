using System.ComponentModel.DataAnnotations;
using QuizAPI.DTOs.Authentication;
using Xunit;

namespace QuizAPI.Tests.Auth;

/// <summary>
/// Tests for the signup password screen (NIST-style blocklist of common / breached passwords).
/// Pure validation logic — no dependencies.
/// </summary>
public class NotACommonPasswordTests
{
    private static bool IsValid(string? password)
    {
        var result = new NotACommonPasswordAttribute()
            .GetValidationResult(password, new ValidationContext(new object()));
        return result == ValidationResult.Success; // Success is represented by null
    }

    [Theory]
    [InlineData("password")]
    [InlineData("Password1")]   // case-insensitive match against "password1"
    [InlineData("123456")]
    [InlineData("qwerty")]
    [InlineData("letmein")]
    public void RejectsKnownCommonPasswords(string password)
    {
        Assert.False(IsValid(password));
    }

    [Fact]
    public void RejectsASingleRepeatedCharacter()
    {
        Assert.False(IsValid("aaaaaaaaaaaa"));
    }

    [Theory]
    [InlineData("correct-horse-battery-staple")]
    [InlineData("a-strong-passphrase-42")]
    public void AcceptsStrongPassphrases(string password)
    {
        Assert.True(IsValid(password));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void DefersEmptyValuesToOtherValidators(string? password)
    {
        // [Required] / [MinLength] own the empty case, so this attribute treats it as valid.
        Assert.True(IsValid(password));
    }
}
