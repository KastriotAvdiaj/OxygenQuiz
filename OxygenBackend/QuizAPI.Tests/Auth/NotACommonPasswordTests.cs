using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Configuration;
using QuizAPI.DTOs.Authentication;
using Xunit;

namespace QuizAPI.Tests.Auth;

/// <summary>
/// Tests for the signup password screen (NIST-style blocklist of common / breached passwords).
/// Pure validation logic — no dependencies.
/// </summary>
public class NotACommonPasswordTests
{
    private static bool IsValid(string? password, IConfiguration? configuration = null)
    {
        var context = new ValidationContext(
            new object(), configuration is null ? null : new ConfigProvider(configuration), null);
        var result = new NotACommonPasswordAttribute().GetValidationResult(password, context);
        return result == ValidationResult.Success; // Success is represented by null
    }

    private static IConfiguration Config(string? enabled) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(enabled is null
                ? new Dictionary<string, string?>()
                : new Dictionary<string, string?> { ["Auth:CommonPasswordCheck:Enabled"] = enabled })
            .Build();

    private sealed class ConfigProvider(IConfiguration configuration) : IServiceProvider
    {
        public object? GetService(Type serviceType) =>
            serviceType == typeof(IConfiguration) ? configuration : null;
    }

    [Fact]
    public void SwitchedOff_AcceptsACommonPassword()
    {
        // appsettings.Development.json: test accounts may be "admin" or "password".
        Assert.True(IsValid("password", Config("false")));
        Assert.True(IsValid("aaaa", Config("false")));
    }

    [Theory]
    [InlineData("true")]
    [InlineData(null)]   // no setting at all: the rule stays on
    public void SwitchedOnOrUnset_StillRejects(string? enabled)
    {
        Assert.False(IsValid("password", Config(enabled)));
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
