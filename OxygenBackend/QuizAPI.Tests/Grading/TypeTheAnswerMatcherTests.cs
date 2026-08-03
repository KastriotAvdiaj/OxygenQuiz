using QuizAPI.Models;
using QuizAPI.Services.Grading;
using Xunit;

namespace QuizAPI.Tests.Grading;

/// <summary>
/// Unit tests for the shared typed-answer matcher. Pure and stateless, so these are fast and
/// deterministic. If a change alters what counts as a correct answer, these break first.
///
/// Both the live grader and the question preview call this, so these tests cover both paths.
/// See docs/quiz/typed-answer-matching.md.
/// </summary>
public class TypeTheAnswerMatcherTests
{
    private static TypeTheAnswerQuestion Question(
        string correct = "Paris",
        bool caseSensitive = false,
        bool partial = false,
        params string[] alternatives) =>
        new()
        {
            CorrectAnswer = correct,
            IsCaseSensitive = caseSensitive,
            AllowPartialMatch = partial,
            AcceptableAnswers = alternatives.ToList(),
        };

    // ── Exact matching ────────────────────────────────────────────────────────

    [Fact]
    public void ExactAnswer_IsCorrect() =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(Question(), "Paris"));

    [Fact]
    public void WrongAnswer_IsNotCorrect() =>
        Assert.False(TypeTheAnswerMatcher.IsCorrect(Question(), "London"));

    [Fact]
    public void CaseInsensitiveByDefault() =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(Question(), "paris"));

    [Fact]
    public void CaseSensitive_RejectsWrongCase() =>
        Assert.False(TypeTheAnswerMatcher.IsCorrect(Question(caseSensitive: true), "paris"));

    [Fact]
    public void CaseSensitive_AcceptsExactCase() =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(Question(caseSensitive: true), "Paris"));

    // ── Normalisation: whitespace ─────────────────────────────────────────────

    [Theory]
    [InlineData(" Paris")]
    [InlineData("Paris ")]
    [InlineData("  Paris  ")]
    [InlineData("\tParis\n")]
    public void SurroundingWhitespace_IsIgnored(string submitted) =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(Question(), submitted));

    [Fact]
    public void InternalWhitespaceRuns_AreCollapsed() =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(Question(correct: "New York"), "New    York"));

    [Fact]
    public void WhitespaceIsNormalisedUnderCaseSensitivityToo() =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(Question(caseSensitive: true), " Paris "));

    /// A stored answer with a stray trailing space shouldn't punish a player who types it cleanly.
    [Fact]
    public void StoredAnswerWhitespace_IsIgnored() =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(Question(correct: "Paris  "), "Paris"));

    // ── Normalisation: accents, punctuation, articles ─────────────────────────
    // All unconditional: these are formatting differences, not wrong answers.

    [Theory]
    [InlineData("Café", "Cafe")]
    [InlineData("Cafe", "Café")]
    [InlineData("Zürich", "Zurich")]
    [InlineData("Bogotá", "bogota")]
    public void Diacritics_AreIgnored(string correct, string submitted) =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(Question(correct: correct), submitted));

    [Theory]
    [InlineData("U.S.A.", "USA")]
    [InlineData("Mother's Day", "Mothers Day")]
    [InlineData("Rock & Roll", "Rock Roll")]
    public void Punctuation_IsIgnored(string correct, string submitted) =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(Question(correct: correct), submitted));

    [Theory]
    [InlineData("The Beatles", "Beatles")]
    [InlineData("Beatles", "The Beatles")]
    [InlineData("La Traviata", "Traviata")]
    public void LeadingArticle_IsIgnored(string correct, string submitted) =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(Question(correct: correct), submitted));

    /// Only the *leading* article is dropped — one in the middle is carrying meaning.
    [Fact]
    public void InternalArticle_IsKept() =>
        Assert.False(TypeTheAnswerMatcher.IsCorrect(
            Question(correct: "Lord of the Rings"), "Lord of Rings"));

    /// Stripping a one-word answer down to nothing would make it match everything.
    [Fact]
    public void SingleWordArticle_IsNotStripped() =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(Question(correct: "The"), "the"));

    /// Case sensitivity is about case, not about accents or spacing.
    [Fact]
    public void CaseSensitive_StillNormalisesAccents() =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(
            Question(correct: "Café", caseSensitive: true), "Cafe"));

    // ── Alternatives ──────────────────────────────────────────────────────────

    [Fact]
    public void AcceptableAlternative_IsCorrect() =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(
            Question(alternatives: new[] { "City of Light" }), "city of light"));

    [Fact]
    public void BlankAlternative_MatchesNothing() =>
        Assert.False(TypeTheAnswerMatcher.IsCorrect(
            Question(alternatives: new[] { "   " }), "anything"));

    // ── Partial match ─────────────────────────────────────────────────────────

    [Fact]
    public void PartialMatchOff_RejectsContainingAnswer() =>
        Assert.False(TypeTheAnswerMatcher.IsCorrect(
            Question(correct: "Eiffel", partial: false), "the Eiffel Tower"));

    /// The behaviour the builder's switch promises, and which no grader implemented before.
    [Fact]
    public void PartialMatchOn_AcceptsContainingAnswer() =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(
            Question(correct: "Eiffel", partial: true), "the Eiffel Tower"));

    [Fact]
    public void PartialMatchOn_AcceptsMultiWordAnswerInASentence() =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(
            Question(correct: "Eiffel Tower", partial: true), "it is the Eiffel Tower in Paris"));

    /// A multi-word answer must appear as adjacent words, not scattered.
    [Fact]
    public void PartialMatchOn_RequiresAContiguousRun() =>
        Assert.False(TypeTheAnswerMatcher.IsCorrect(
            Question(correct: "Eiffel Tower", partial: true), "the Eiffel is a Tower"));

    [Fact]
    public void PartialMatchOn_AppliesToAlternativesToo() =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(
            Question(correct: "Eiffel", partial: true, alternatives: new[] { "Tour Eiffel" }),
            "la Tour Eiffel a Paris"));

    /// One-directional on purpose: a prefix of the answer must not pass, or a player could guess
    /// a letter at a time.
    [Fact]
    public void PartialMatchOn_RejectsPrefixOfTheAnswer() =>
        Assert.False(TypeTheAnswerMatcher.IsCorrect(
            Question(correct: "Eiffel", partial: true), "Eiff"));

    [Fact]
    public void PartialMatchOn_RespectsCaseSensitivity() =>
        Assert.False(TypeTheAnswerMatcher.IsCorrect(
            Question(correct: "Eiffel", caseSensitive: true, partial: true), "the eiffel tower"));

    // ── Partial match: the false positives whole-word containment closes ──────
    // Raw substring accepted every one of these, which made short answers guessable by typing a
    // long enough sentence.

    [Theory]
    [InlineData("cat", "concatenate")]
    [InlineData("art", "Bart Simpson")]
    [InlineData("one", "money")]
    [InlineData("3", "13")]
    public void PartialMatchOn_RejectsSubstringInsideAWord(string correct, string submitted) =>
        Assert.False(TypeTheAnswerMatcher.IsCorrect(
            Question(correct: correct, partial: true), submitted));

    [Fact]
    public void PartialMatchOn_StillAcceptsTheWordItself() =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(
            Question(correct: "cat", partial: true), "it is a cat"));

    // ── Partial match: space-less scripts ─────────────────────────────────────
    // Word-boundary matching is meaningless where the script doesn't delimit words, so these fall
    // back to substring. The fallback must key off the *script*, not off "both sides are one
    // token" — that condition is also true of every one-word English answer, which is how
    // "concatenate" once passed for "cat".

    [Theory]
    [InlineData("猫", "黒猫が好きです")]      // Japanese
    [InlineData("北京", "我住在北京")]        // Chinese
    [InlineData("แมว", "ฉันมีแมว")]           // Thai
    public void PartialMatchOn_SpacelessScript_FallsBackToSubstring(string correct, string submitted) =>
        Assert.True(TypeTheAnswerMatcher.IsCorrect(
            Question(correct: correct, partial: true), submitted));

    /// Hangul is space-delimited, so Korean gets the same whole-word treatment as English rather
    /// than the space-less fallback.
    [Fact]
    public void PartialMatchOn_Korean_UsesWholeWordMatching()
    {
        Assert.True(TypeTheAnswerMatcher.IsCorrect(
            Question(correct: "고양이", partial: true), "검은 고양이 입니다"));
        Assert.False(TypeTheAnswerMatcher.IsCorrect(
            Question(correct: "고양이", partial: true), "검은고양이입니다"));
    }

    // ── Empty input ───────────────────────────────────────────────────────────
    // Every string contains the empty string, so without an explicit guard an empty submission
    // would match everything once partial match is on.

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void EmptySubmission_IsNeverCorrect(string? submitted)
    {
        Assert.False(TypeTheAnswerMatcher.IsCorrect(Question(partial: false), submitted));
        Assert.False(TypeTheAnswerMatcher.IsCorrect(Question(partial: true), submitted));
    }

    /// An answer that is nothing but punctuation normalises to empty — it must not match everything.
    [Fact]
    public void PunctuationOnlySubmission_IsNeverCorrect() =>
        Assert.False(TypeTheAnswerMatcher.IsCorrect(Question(partial: true), "..."));

    [Fact]
    public void EmptyStoredAnswer_MatchesNothing() =>
        Assert.False(TypeTheAnswerMatcher.IsCorrect(
            Question(correct: "", partial: true), "anything at all"));
}
