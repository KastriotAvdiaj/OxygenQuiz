using QuizAPI.ManyToManyTables;
using QuizAPI.Services.Scoring;
using Xunit;

namespace QuizAPI.Tests.Scoring;

/// <summary>
/// Unit tests for the single source of truth for answer scoring. Pure and stateless, so these are
/// fast and deterministic. If a deploy changes how points are awarded, these break first.
///
/// The scale is the high-resolution 1000-point base (see QuizScoring): instant answer = 1500,
/// full-time answer = 1000, rounded once at the end so sub-second speed differences matter.
/// </summary>
public class QuizScoringTests
{
    [Fact]
    public void InstantAnswer_EarnsFullSpeedBonus()
    {
        // 0s of a 10s limit => +50% bonus => 1000 * 1.5 = 1500
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.Zero, 10, PointSystem.Standard);
        Assert.Equal(1500, points);
    }

    [Fact]
    public void UsingTheFullTimeLimit_EarnsNoSpeedBonus()
    {
        // 10s of a 10s limit => 0 remaining => base 1000
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(10), 10, PointSystem.Standard);
        Assert.Equal(1000, points);
    }

    [Fact]
    public void HalfTheTime_EarnsHalfTheBonus()
    {
        // 5s of 10s => 50% remaining => +25% => 1250
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(5), 10, PointSystem.Standard);
        Assert.Equal(1250, points);
    }

    [Fact]
    public void SubSecondDifferences_ProduceDifferentScores()
    {
        // The whole reason for the 1000 base: 1.2s vs 1.3s on a 30s limit must NOT tie.
        // 1.2s: remaining 28.8/30 => +48% => 1480. 1.3s: remaining 28.7/30 => +47.833..% => 1478.
        var fast = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(1.2), 30, PointSystem.Standard);
        var slow = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(1.3), 30, PointSystem.Standard);

        Assert.Equal(1480, fast);
        Assert.Equal(1478, slow);
        Assert.True(fast > slow, "answering 0.1s faster must score strictly higher");
    }

    [Fact]
    public void HundredMillisecondEdge_OnShortLimit_IsWorthFivePoints()
    {
        // On a 10s question the bonus slope is 50 pts/s => 0.1s = 5 pts.
        var at2s = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(2.0), 10, PointSystem.Standard);
        var at2_1s = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(2.1), 10, PointSystem.Standard);
        Assert.Equal(5, at2s - at2_1s);
    }

    [Fact]
    public void RoundingHappensOnce_AtTheEnd()
    {
        // 3.333s of 10s => remaining 6.667/10 => bonus 0.33335 => 1333.35 => rounds to 1333.
        // The old implementation truncated before the multiplier; verify Double doesn't inherit
        // a pre-rounded value (1333.35 * 2 = 2666.7 => 2667, NOT 1333 * 2 = 2666).
        var standard = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(3.333), 10, PointSystem.Standard);
        var doubled = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(3.333), 10, PointSystem.Double);

        Assert.Equal(1333, standard);
        Assert.Equal(2667, doubled);
    }

    [Fact]
    public void NoTimeLimit_EarnsNoSpeedBonus()
    {
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(3), 0, PointSystem.Standard);
        Assert.Equal(1000, points);
    }

    [Fact]
    public void AnsweringAfterTheLimit_NeverGoesNegative_FallsBackToBase()
    {
        // Took longer than the limit: remaining is clamped to 0, so just the base value.
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(15), 10, PointSystem.Standard);
        Assert.Equal(1000, points);
    }

    [Fact]
    public void NegativeElapsedTime_IsIgnored_FallsBackToBase()
    {
        // Defensive: a negative measured time must not inflate the score.
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(-5), 10, PointSystem.Standard);
        Assert.Equal(1000, points);
    }

    [Fact]
    public void DoublePointSystem_DoublesTheResult()
    {
        // Instant standard = 1500, doubled = 3000
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.Zero, 10, PointSystem.Double);
        Assert.Equal(3000, points);
    }

    [Fact]
    public void QuadruplePointSystem_QuadruplesTheResult()
    {
        // Instant standard = 1500, quadrupled = 6000
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.Zero, 10, PointSystem.Quadruple);
        Assert.Equal(6000, points);
    }

    [Theory]
    [InlineData(PointSystem.Standard, 1)]
    [InlineData(PointSystem.Double, 2)]
    [InlineData(PointSystem.Quadruple, 4)]
    public void MultiplierFor_ReturnsConfiguredMultiplier(PointSystem system, int expected)
    {
        Assert.Equal(expected, QuizScoring.MultiplierFor(system));
    }

    [Fact]
    public void ScoreIsAlwaysAtLeastOne()
    {
        // Across a sweep of inputs the result is never below the documented floor of 1.
        for (var limit = 0; limit <= 30; limit++)
        {
            for (var taken = 0; taken <= 40; taken += 2)
            {
                var points = QuizScoring.PointsForCorrectAnswer(
                    TimeSpan.FromSeconds(taken), limit, PointSystem.Standard);
                Assert.True(points >= 1, $"limit={limit}, taken={taken} gave {points}");
            }
        }
    }

    [Fact]
    public void ScoreIsMonotonicallyNonIncreasing_AsTimeTakenGrows()
    {
        // Fairness invariant: taking longer can never earn MORE points.
        var previous = int.MaxValue;
        for (var ms = 0; ms <= 12_000; ms += 50)
        {
            var points = QuizScoring.PointsForCorrectAnswer(
                TimeSpan.FromMilliseconds(ms), 10, PointSystem.Standard);
            Assert.True(points <= previous, $"score rose from {previous} to {points} at {ms}ms");
            previous = points;
        }
    }
}
