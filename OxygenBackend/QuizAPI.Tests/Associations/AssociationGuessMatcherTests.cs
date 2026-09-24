using QuizAPI.Services.Associations;
using Xunit;

namespace QuizAPI.Tests.Associations;

/// <summary>
/// A Guess is matched by the shared typed-answer core (TypeTheAnswerMatcher.IsMatch), with case
/// ignored and partial match off. These pin the choices specific to boards; the normalisation
/// itself is covered by TypeTheAnswerMatcherTests.
/// </summary>
public class AssociationGuessMatcherTests
{
    private static readonly SolutionKey Drite = new("Dritë", Array.Empty<string>());
    private static readonly SolutionKey Caj = new("Çaj", Array.Empty<string>());
    private static readonly SolutionKey Rome = new("Rome", new[] { "Roma" });

    [Theory]
    [InlineData("drite")]
    [InlineData("DRITË")]
    [InlineData("  Dritë ")]
    public void AlbanianLetters_MatchWithOrWithoutTheirMarks(string guess) =>
        Assert.True(AssociationGuessMatcher.IsMatch(Drite, guess));

    [Fact]
    public void Cedilla_IsForgiven() => Assert.True(AssociationGuessMatcher.IsMatch(Caj, "caj"));

    [Fact]
    public void AcceptableSpellings_Count() => Assert.True(AssociationGuessMatcher.IsMatch(Rome, "roma"));

    [Fact]
    public void ALeadingArticle_IsDropped() => Assert.True(AssociationGuessMatcher.IsMatch(Rome, "the Rome"));

    /// <summary>Partial match is off: the one exact linking word is the point of a board.</summary>
    [Fact]
    public void ASentenceContainingTheSolution_IsNotTheSolution() =>
        Assert.False(AssociationGuessMatcher.IsMatch(Rome, "the city of Rome"));

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Nothing_MatchesNothing(string? guess) => Assert.False(AssociationGuessMatcher.IsMatch(Rome, guess));

    [Fact]
    public void AnotherWord_IsWrong() => Assert.False(AssociationGuessMatcher.IsMatch(Rome, "Paris"));
}
