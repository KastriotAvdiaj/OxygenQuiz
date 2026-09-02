using QuizAPI.Services.Password;
using Xunit;

namespace QuizAPI.Tests.Auth;

/// <summary>
/// The two pure halves of the k-anonymity lookup: how the hash is split, and how the response is
/// read.
///
/// <para><b>Why the parsing is worth testing at all.</b> Every way this breaks looks identical to
/// working. A case change, an unhandled trailing <c>\r</c>, an extra column in the response — each
/// turns "this password is breached" into "no match", which is exactly what a healthy check
/// returns for a good password. Nothing errors, nothing logs, and the screening is simply gone.
/// The network half fails loudly by comparison, and fails open on purpose.</para>
/// </summary>
public class PwnedPasswordsCheckerTests
{
    /// <summary>
    /// "password" is the canonical example in HIBP's own range-API documentation, so this pins the
    /// split against a value anyone can re-derive rather than against our own output.
    /// </summary>
    [Fact]
    public void The_hash_is_split_five_and_thirty_five()
    {
        var (prefix, suffix) = PwnedPasswordsChecker.HashPrefixAndSuffix("password");

        // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
        Assert.Equal("5BAA6", prefix);
        Assert.Equal("1E4C9B93F3F0682250B6CF8331B7EE68FD8", suffix);
        Assert.Equal(35, suffix.Length);
    }

    [Fact]
    public void An_empty_password_is_not_reported_as_breached()
    {
        // [Required] owns the empty case; reporting it here would show two errors for one mistake.
        Assert.False(PwnedPasswordsChecker.ContainsSuffix("", "ANYTHING"));
    }

    [Theory]
    // The shape the API actually returns: SUFFIX:COUNT, CRLF-separated.
    [InlineData("0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2\r\n",
                "00D4F6E8FA6EECAD2A3AA415EEC418D38EC", true)]
    // Trailing \r must not become part of the suffix — this is the classic silent break.
    [InlineData("ABCDEF0123456789ABCDEF0123456789ABC:42\r\n", "ABCDEF0123456789ABCDEF0123456789ABC", true)]
    // LF-only, in case the transport normalises.
    [InlineData("ABCDEF0123456789ABCDEF0123456789ABC:42\n", "ABCDEF0123456789ABCDEF0123456789ABC", true)]
    // HIBP returns uppercase; a lowercase suffix must still match rather than silently miss.
    [InlineData("ABCDEF0123456789ABCDEF0123456789ABC:42\r\n", "abcdef0123456789abcdef0123456789abc", true)]
    // A genuine miss.
    [InlineData("ABCDEF0123456789ABCDEF0123456789ABC:42\r\n", "0000000000000000000000000000000000F", false)]
    // A padded entry (count 0) still counts as present in the list — HIBP's padding uses fake
    // suffixes, so this only matters in that a real match is never zero-count.
    [InlineData("ABCDEF0123456789ABCDEF0123456789ABC:0\r\n", "ABCDEF0123456789ABCDEF0123456789ABC", true)]
    public void Suffixes_are_matched_against_the_response(string body, string suffix, bool expected)
    {
        Assert.Equal(expected, PwnedPasswordsChecker.ContainsSuffix(body, suffix));
    }

    [Fact]
    public void The_disabled_checker_reports_nothing_as_breached()
    {
        var checker = new NullBreachedPasswordChecker();

        Assert.False(checker.IsBreachedAsync("password").Result);
    }
}
