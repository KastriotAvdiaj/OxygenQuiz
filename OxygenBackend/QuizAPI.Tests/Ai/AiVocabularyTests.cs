using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Ai;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// The lookup name lists in a generation request are the <b>vocabulary the model may choose
/// from</b>, and every name in one is an answer we have promised to accept. The seeded
/// "Unspecified" row is not such an answer: a question may never be stored as it, and a quiz
/// filed under it cannot be published — so <c>Normalise</c> drops it before the prompt is built.
///
/// This is a regression test with a real incident behind it. The wizard sent the lookup tables
/// straight through, "Unspecified" included; the model duly picked it, the name resolved to a
/// real id, and the builder opened with an Unspecified category that looked chosen. The API then
/// refused the save — correctly, and far too late. See
/// docs/quiz/quiz-question-classification.md § "How it used to leak in".
///
/// Asserted here rather than on the frontend filter alone, because the prompt is a server-side
/// contract: a second client, a replayed request or a stale bundle must not be able to reopen it.
/// </summary>
public class AiVocabularyTests
{
    private static AiGenerationService Build() =>
        new(
            Mock.Of<IQuizAiProvider>(),
            Mock.Of<IAiQuotaService>(),
            Mock.Of<IUserRepository>(),
            new AiPromptBuilder(),
            Options.Create(new AiOptions { Enabled = true }),
            NullLogger<AiGenerationService>.Instance);

    /// <summary>A request whose lookup tables still carry the seeded row, as the DB serves them.</summary>
    private static AiGenerationRequest RequestIncludingUnspecified() => new()
    {
        Mode = AiGenerationMode.Topic,
        Topic = "The French Revolution",
        LanguageName = null,
        LanguageNames = ["Unspecified", "English", "Albanian"],
        CategoryNames = ["Unspecified", "History", "Science"],
        DifficultyNames = ["Unspecified", "Easy", "Hard"],
        QuestionCount = 8,
        AllowedTypes = ["MultipleChoice", "TrueFalse"],
    };

    [Fact]
    public void The_seeded_default_is_never_offered_to_the_model()
    {
        var prompt = Build().BuildPrompt(RequestIncludingUnspecified());

        Assert.DoesNotContain("Unspecified", prompt, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// The filter is by name, so this is the half that would fail if it ever became a broader
    /// match — a vocabulary silently emptied of real choices generates just as happily, and the
    /// model would simply stop being told what your categories are.
    /// </summary>
    [Fact]
    public void Real_names_still_reach_the_prompt()
    {
        var prompt = Build().BuildPrompt(RequestIncludingUnspecified());

        Assert.Contains("History", prompt);
        Assert.Contains("Science", prompt);
        Assert.Contains("English", prompt);
        Assert.Contains("Easy", prompt);
    }

    /// <summary>Case and padding are the seeder's business, not a way past the rule.</summary>
    [Theory]
    [InlineData("unspecified")]
    [InlineData("UNSPECIFIED")]
    [InlineData("  Unspecified  ")]
    public void Matched_case_insensitively_and_trimmed(string seeded)
    {
        var prompt = Build().BuildPrompt(
            RequestIncludingUnspecified() with { CategoryNames = [seeded, "History"] });

        Assert.DoesNotContain("nspecified", prompt);
        Assert.Contains("History", prompt);
    }
}
