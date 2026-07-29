using QuizAPI.Services.Scoring;
using Xunit;

namespace QuizAPI.Tests.Scoring;

/// <summary>
/// Unit tests for the latency-compensation rule: which elapsed time an answer is scored with.
/// The trust boundary lives entirely in <see cref="QuizTiming.EffectiveElapsed"/>, so these tests
/// double as the spec for what a client can and cannot make the server believe.
/// </summary>
public class QuizTimingTests
{
    private static readonly TimeSpan Credit = TimeSpan.FromSeconds(2);

    [Fact]
    public void HonestClient_OnSlowConnection_GetsItsOwnMeasurement()
    {
        // Player thought for 1.2s; the request took 400ms of network on top.
        var effective = QuizTiming.EffectiveElapsed(
            serverElapsed: TimeSpan.FromMilliseconds(1600),
            clientElapsedMs: 1200,
            maxLatencyCredit: Credit);

        Assert.Equal(TimeSpan.FromMilliseconds(1200), effective);
    }

    [Fact]
    public void MissingClientValue_FallsBackToServerWindow()
    {
        var server = TimeSpan.FromMilliseconds(1600);
        Assert.Equal(server, QuizTiming.EffectiveElapsed(server, clientElapsedMs: null, Credit));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-500)]
    public void NonPositiveClientValue_FallsBackToServerWindow(long clientMs)
    {
        var server = TimeSpan.FromMilliseconds(1600);
        Assert.Equal(server, QuizTiming.EffectiveElapsed(server, clientMs, Credit));
    }

    [Fact]
    public void ClientClaimingMoreThanServerWindow_IsRejected()
    {
        // Physically impossible for an honest client: its window is inside the server's.
        var server = TimeSpan.FromMilliseconds(1600);
        var effective = QuizTiming.EffectiveElapsed(server, clientElapsedMs: 5000, Credit);
        Assert.Equal(server, effective);
    }

    [Fact]
    public void ClientClaimingImplausiblyFastAnswer_IsRejected()
    {
        // Server saw 10s pass but the client claims 0.1s => gap of 9.9s >> max credit.
        // A hacked client trying to farm the full speed bonus gets the server window instead.
        var server = TimeSpan.FromSeconds(10);
        var effective = QuizTiming.EffectiveElapsed(server, clientElapsedMs: 100, Credit);
        Assert.Equal(server, effective);
    }

    [Fact]
    public void GapExactlyAtMaxCredit_IsStillAccepted()
    {
        // Boundary: serverElapsed - clientElapsed == credit is plausible (inclusive bound).
        var effective = QuizTiming.EffectiveElapsed(
            serverElapsed: TimeSpan.FromMilliseconds(3200),
            clientElapsedMs: 1200,
            maxLatencyCredit: Credit);

        Assert.Equal(TimeSpan.FromMilliseconds(1200), effective);
    }

    [Fact]
    public void CheatCeiling_IsBoundedByMaxCredit()
    {
        // The most a tampered client can shave off is exactly the latency credit — never more.
        var server = TimeSpan.FromSeconds(5);
        var bestAcceptedClaim = (long)(server - Credit).TotalMilliseconds;

        var effective = QuizTiming.EffectiveElapsed(server, bestAcceptedClaim, Credit);

        Assert.Equal(server - Credit, effective);
        // One millisecond greedier and the claim collapses back to the server window.
        Assert.Equal(server, QuizTiming.EffectiveElapsed(server, bestAcceptedClaim - 1, Credit));
    }

    [Fact]
    public void DefaultCredit_IsUsed_WhenNoneSupplied()
    {
        var server = TimeSpan.FromSeconds(3);
        // Gap of 1.8s < default 2s => accepted.
        var effective = QuizTiming.EffectiveElapsed(server, clientElapsedMs: 1200);
        Assert.Equal(TimeSpan.FromMilliseconds(1200), effective);
    }
}
