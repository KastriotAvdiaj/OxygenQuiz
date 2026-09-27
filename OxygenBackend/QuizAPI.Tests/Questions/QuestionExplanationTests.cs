using QuizAPI.DTOs.Question;
using QuizAPI.Exceptions;
using QuizAPI.Mapping;
using QuizAPI.Models;
using Xunit;

namespace QuizAPI.Tests.Questions;

/// <summary>
/// The explanation is optional, so "none" must have exactly one representation (null) — a blank
/// string stored from an empty textarea would render as an empty "Why?" box. And every write path
/// goes through the same cap. See docs/quiz/question-explanations.md.
/// </summary>
public class QuestionExplanationTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   \n ")]
    public void Blank_IsStoredAsNull(string? input)
    {
        Assert.Null(QuestionExplanation.Normalize(input));
        Assert.Null(QuestionExplanation.NormalizeAndTruncate(input));
    }

    [Fact]
    public void Surrounding_whitespace_is_trimmed()
    {
        Assert.Equal("Rome is the capital.", QuestionExplanation.Normalize("  Rome is the capital.\n"));
    }

    [Fact]
    public void An_author_over_the_cap_is_told_so()
    {
        var tooLong = new string('a', QuestionExplanation.MaxLength + 1);

        var ex = Assert.Throws<AppValidationException>(() => QuestionExplanation.Normalize(tooLong));
        Assert.Equal(QuestionExplanation.TooLongMessage, ex.Message);
    }

    [Fact]
    public void Exactly_the_cap_is_allowed()
    {
        var atCap = new string('a', QuestionExplanation.MaxLength);
        Assert.Equal(atCap, QuestionExplanation.Normalize(atCap));
    }

    [Fact]
    public void A_model_over_the_cap_is_cut_not_rejected()
    {
        var tooLong = new string('a', QuestionExplanation.MaxLength + 50);
        Assert.Equal(QuestionExplanation.MaxLength, QuestionExplanation.NormalizeAndTruncate(tooLong)!.Length);
    }

    [Fact]
    public void Create_and_update_both_normalise()
    {
        var created = new TrueFalseQuestionCM { Text = "Q", Explanation = "  why  " }.ToEntity();
        Assert.Equal("why", created.Explanation);

        var question = new TrueFalseQuestion { Explanation = "old" };
        new TrueFalseQuestionUM { Text = "Q", Explanation = " " }.ApplyTo(question);
        // Clearing the textarea clears the explanation — it doesn't keep the old one.
        Assert.Null(question.Explanation);
    }
}
