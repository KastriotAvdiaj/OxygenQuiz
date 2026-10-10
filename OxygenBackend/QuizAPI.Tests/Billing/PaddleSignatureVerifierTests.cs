using Microsoft.Extensions.Time.Testing;
using QuizAPI.Services.Billing;
using Xunit;

namespace QuizAPI.Tests.Billing;

/// <summary>
/// <see cref="PaddleSignatureVerifier"/> is static and pure, so these run against a hand-built
/// <c>Paddle-Signature</c> header rather than a recorded request — the HMAC math is the same
/// either way (docs/proposals/paid-plans-and-payments.md §5.5).
/// </summary>
public class PaddleSignatureVerifierTests
{
    private const string Secret = "whsec_test_secret";
    private static readonly DateTimeOffset Now = new(2026, 10, 10, 12, 0, 0, TimeSpan.Zero);
    private static readonly FakeTimeProvider Clock = new(Now);

    private static string Header(string ts, string body, string secret = Secret) =>
        PaddleTestSignatures.Header(ts, body, secret);

    [Fact]
    public void A_correctly_signed_header_within_the_window_verifies()
    {
        var body = """{"event_id":"evt_1"}""";
        var ts = Now.ToUnixTimeSeconds().ToString();

        Assert.True(PaddleSignatureVerifier.Verify(Header(ts, body), body, Secret, TimeSpan.FromMinutes(5), Clock));
    }

    [Fact]
    public void A_tampered_body_fails_even_with_a_valid_looking_header()
    {
        var signedBody = """{"event_id":"evt_1"}""";
        var ts = Now.ToUnixTimeSeconds().ToString();
        var header = Header(ts, signedBody);

        var tamperedBody = """{"event_id":"evt_2"}""";

        Assert.False(PaddleSignatureVerifier.Verify(header, tamperedBody, Secret, TimeSpan.FromMinutes(5), Clock));
    }

    [Fact]
    public void A_stale_timestamp_outside_the_window_is_rejected()
    {
        var body = """{"event_id":"evt_1"}""";
        var staleTs = Now.AddMinutes(-10).ToUnixTimeSeconds().ToString();

        Assert.False(PaddleSignatureVerifier.Verify(Header(staleTs, body), body, Secret, TimeSpan.FromMinutes(5), Clock));
    }

    [Fact]
    public void The_wrong_secret_does_not_verify()
    {
        var body = """{"event_id":"evt_1"}""";
        var ts = Now.ToUnixTimeSeconds().ToString();

        Assert.False(PaddleSignatureVerifier.Verify(Header(ts, body, "a-different-secret"), body, Secret, TimeSpan.FromMinutes(5), Clock));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-a-valid-header")]
    [InlineData("ts=123")]
    [InlineData("h1=abc")]
    public void A_missing_or_malformed_header_fails_cleanly(string? header)
    {
        Assert.False(PaddleSignatureVerifier.Verify(header, "{}", Secret, TimeSpan.FromMinutes(5), Clock));
    }

    [Fact]
    public void A_malformed_h1_that_is_not_valid_hex_fails_instead_of_throwing()
    {
        var body = """{"event_id":"evt_1"}""";
        var ts = Now.ToUnixTimeSeconds().ToString();

        Assert.False(PaddleSignatureVerifier.Verify($"ts={ts};h1=not-hex!!", body, Secret, TimeSpan.FromMinutes(5), Clock));
    }
}
