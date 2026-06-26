using QuizAPI.ManyToManyTables;
using QuizAPI.Services.Scoring;
using Xunit;

namespace QuizAPI.Tests.Scoring;

/// <summary>
/// Unit tests for the single source of truth for answer scoring. Pure and stateless, so these are
/// fast and deterministic. If a deploy changes how points are awarded, these break first.
/// </summary>
public class QuizScoringTests
{
    [Fact]
    public void InstantAnswer_EarnsFullSpeedBonus()
    {
        // 0s of a 10s limit => +50% bonus => (int)(10 * 1.5) = 15
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.Zero, 10, PointSystem.Standard);
        Assert.Equal(15, points);
    }

    [Fact]
    public void UsingTheFullTimeLimit_EarnsNoSpeedBonus()
    {
        // 10s of a 10s limit => 0 remaining => base 10
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(10), 10, PointSystem.Standard);
        Assert.Equal(10, points);
    }

    [Fact]
    public void HalfTheTime_EarnsHalfTheBonus()
    {
        // 5s of 10s => 50% remaining => +25% => (int)(10 * 1.25) = 12
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(5), 10, PointSystem.Standard);
        Assert.Equal(12, points);
    }

    [Fact]
    public void NoTimeLimit_EarnsNoSpeedBonus()
    {
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(3), 0, PointSystem.Standard);
        Assert.Equal(10, points);
    }

    [Fact]
    public void AnsweringAfterTheLimit_NeverGoesNegative_FallsBackToBase()
    {
        // Took longer than the limit: remaining is clamped to 0, so just the base value.
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(15), 10, PointSystem.Standard);
        Assert.Equal(10, points);
    }

    [Fact]
    public void NegativeElapsedTime_IsIgnored_FallsBackToBase()
    {
        // Defensive: a negative measured time must not inflate the score.
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.FromSeconds(-5), 10, PointSystem.Standard);
        Assert.Equal(10, points);
    }

    [Fact]
    public void DoublePointSystem_DoublesTheResult()
    {
        // Instant standard = 15, doubled = 30
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.Zero, 10, PointSystem.Double);
        Assert.Equal(30, points);
    }

    [Fact]
    public void QuadruplePointSystem_QuadruplesTheResult()
    {
        // Instant standard = 15, quadrupled = 60
        var points = QuizScoring.PointsForCorrectAnswer(TimeSpan.Zero, 10, PointSystem.Quadruple);
        Assert.Equal(60, points);
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
}
