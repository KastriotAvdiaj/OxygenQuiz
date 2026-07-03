using QuizAPI.Controllers.Quizzes;
using QuizAPI.Models.Quiz;
using Xunit;

namespace QuizAPI.Tests.Discovery;

/// <summary>
/// Tests for the catalogue's "variety" ordering (docs/quiz-discovery.md): the first page
/// must interleave categories — newest of each category first — so new users see the
/// breadth of the app instead of a wall of one category. The ordering is plain LINQ, so
/// it runs identically here (in memory) and in SQL via EF.
/// </summary>
public class QuizVarietyOrderingTests
{
    private static Quiz Q(int id, int categoryId, int daysOld) => new()
    {
        Id = id,
        CategoryId = categoryId,
        CreatedAt = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc).AddDays(-daysOld),
    };

    [Fact]
    public void FirstPage_InterleavesCategories_NewestOfEachFirst()
    {
        // Category 1 dominates by volume — exactly the situation the ordering fixes.
        var quizzes = new[]
        {
            Q(1, categoryId: 1, daysOld: 0),
            Q(2, categoryId: 1, daysOld: 1),
            Q(3, categoryId: 1, daysOld: 2),
            Q(4, categoryId: 1, daysOld: 3),
            Q(5, categoryId: 2, daysOld: 5),
            Q(6, categoryId: 2, daysOld: 6),
            Q(7, categoryId: 3, daysOld: 9),
        }.AsQueryable();

        var ordered = QuizVarietyOrdering.Apply(quizzes).ToList();

        // Round 1: the newest quiz of every category (recency-ordered within the round),
        // only then round 2, and so on.
        Assert.Equal(new[] { 1, 5, 7 }, ordered.Take(3).Select(q => q.Id));
        Assert.Equal(new[] { 2, 6 }, ordered.Skip(3).Take(2).Select(q => q.Id));
        Assert.Equal(new[] { 3, 4 }, ordered.Skip(5).Select(q => q.Id));
    }

    [Fact]
    public void SingleCategory_FallsBackToNewestFirst()
    {
        var quizzes = new[] { Q(1, 1, 2), Q(2, 1, 0), Q(3, 1, 1) }.AsQueryable();

        var ordered = QuizVarietyOrdering.Apply(quizzes).ToList();

        Assert.Equal(new[] { 2, 3, 1 }, ordered.Select(q => q.Id));
    }

    [Fact]
    public void IdenticalTimestamps_AreOrderedDeterministically()
    {
        // Stable ordering is what keeps server-side pagination consistent between pages.
        var quizzes = new[] { Q(3, 1, 0), Q(1, 1, 0), Q(2, 2, 0) }.AsQueryable();

        var first = QuizVarietyOrdering.Apply(quizzes).Select(q => q.Id).ToList();
        var second = QuizVarietyOrdering.Apply(quizzes).Select(q => q.Id).ToList();

        Assert.Equal(first, second);
        Assert.Equal(3, first.Count);
    }

    [Theory]
    [InlineData("variety:desc", true)]
    [InlineData("variety", true)]
    [InlineData("VARIETY:desc", true)]
    [InlineData("variety:desc,title:asc", true)]
    [InlineData("createdAt:desc", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void IsRequested_MatchesOnlyTheVarietyField(string? sort, bool expected)
    {
        Assert.Equal(expected, QuizVarietyOrdering.IsRequested(sort));
    }
}
