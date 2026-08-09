using QuizAPI.Models;
using Xunit;

namespace QuizAPI.Tests.Questions;

/// <summary>
/// Unit tests for the acceptable-answer rules. Pure and stateless, so these are fast.
///
/// Every write path funnels through Normalize — the standalone question endpoints, the AI quiz
/// import, the CSV import — so what these assert is what ends up in the JSON column.
/// </summary>
public class AcceptableAnswerRulesTests
{
    // ── Cleaning ──────────────────────────────────────────────────────────────

    [Fact]
    public void TrimsWhitespace()
    {
        var result = AcceptableAnswerRules.Normalize(
            new[] { "  Paris  " }, "France", isCaseSensitive: false);

        Assert.Equal(new[] { "Paris" }, result);
    }

    [Fact]
    public void DropsBlankAndNullEntries()
    {
        var result = AcceptableAnswerRules.Normalize(
            new[] { "Paris", "", "   ", null }, "France", isCaseSensitive: false);

        Assert.Equal(new[] { "Paris" }, result);
    }

    [Fact]
    public void DropsEntriesThatDuplicateTheCorrectAnswer()
    {
        var result = AcceptableAnswerRules.Normalize(
            new[] { "paris", "Lutetia" }, "Paris", isCaseSensitive: false);

        Assert.Equal(new[] { "Lutetia" }, result);
    }

    [Fact]
    public void PreservesAuthorOrdering()
    {
        var result = AcceptableAnswerRules.Normalize(
            new[] { "c", "a", "b" }, "z", isCaseSensitive: false);

        Assert.Equal(new[] { "c", "a", "b" }, result);
    }

    [Fact]
    public void NullListBecomesEmptyList() =>
        Assert.Empty(AcceptableAnswerRules.Normalize(null, "Paris", isCaseSensitive: false));

    // ── Duplicates follow the question's own matching rule ────────────────────

    [Fact]
    public void CaseInsensitiveQuestion_CollapsesCaseVariants()
    {
        var result = AcceptableAnswerRules.Normalize(
            new[] { "york", "York" }, "New York", isCaseSensitive: false);

        Assert.Equal(new[] { "york" }, result);
    }

    [Fact]
    public void CaseSensitiveQuestion_KeepsCaseVariants()
    {
        // The question distinguishes these when grading, so collapsing them here would
        // silently delete a valid alternative.
        var result = AcceptableAnswerRules.Normalize(
            new[] { "york", "York" }, "New York", isCaseSensitive: true);

        Assert.Equal(new[] { "york", "York" }, result);
    }

    [Fact]
    public void CaseSensitiveQuestion_OnlyDropsExactMatchOfCorrectAnswer()
    {
        var result = AcceptableAnswerRules.Normalize(
            new[] { "Paris", "paris" }, "Paris", isCaseSensitive: true);

        Assert.Equal(new[] { "paris" }, result);
    }

    // ── The cap ───────────────────────────────────────────────────────────────

    [Fact]
    public void ExceedsCap_IsFalseAtTheCap()
    {
        var atCap = Enumerable.Range(1, AcceptableAnswerRules.MaxCount)
            .Select(i => $"answer {i}");

        var result = AcceptableAnswerRules.Normalize(atCap, "correct", isCaseSensitive: false);

        Assert.False(AcceptableAnswerRules.ExceedsCap(result));
    }

    [Fact]
    public void ExceedsCap_IsTrueOneOver()
    {
        var overCap = Enumerable.Range(1, AcceptableAnswerRules.MaxCount + 1)
            .Select(i => $"answer {i}");

        var result = AcceptableAnswerRules.Normalize(overCap, "correct", isCaseSensitive: false);

        Assert.True(AcceptableAnswerRules.ExceedsCap(result));
    }

    [Fact]
    public void BlankRowsDontCountAgainstTheCap()
    {
        // An author who left trailing rows empty is still within budget.
        var withBlanks = Enumerable.Range(1, AcceptableAnswerRules.MaxCount)
            .Select(i => $"answer {i}")
            .Concat(new[] { "", "   " });

        var result = AcceptableAnswerRules.Normalize(withBlanks, "correct", isCaseSensitive: false);

        Assert.False(AcceptableAnswerRules.ExceedsCap(result));
    }

    [Fact]
    public void NormalizeAndTruncate_KeepsTheFirstAnswersUpToTheCap()
    {
        var overCap = Enumerable.Range(1, AcceptableAnswerRules.MaxCount + 3)
            .Select(i => $"answer {i}");

        var result = AcceptableAnswerRules.NormalizeAndTruncate(
            overCap, "correct", isCaseSensitive: false);

        Assert.Equal(AcceptableAnswerRules.MaxCount, result.Count);
        Assert.Equal("answer 1", result[0]);
    }
}
