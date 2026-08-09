using QuizAPI.Services.Ai;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// The prompt is the one place a leaked primary key would be invisible: it would still generate
/// a perfectly good quiz, and only much later would someone notice the model had been handed our
/// ids. So these tests assert the invariants from docs/quiz/ai-quiz-creation-plan.md §5 directly,
/// rather than golden-matching the whole string (which would break on every wording tweak).
/// </summary>
public class AiPromptBuilderTests
{
    private static readonly AiPromptBuilder Builder = new();

    private static readonly string[] Categories = ["History", "Science", "Sport"];
    private static readonly string[] Languages = ["English", "Albanian", "German"];

    /// <summary>The one-box flow: the user typed a topic and nothing else.</summary>
    private static AiGenerationRequest InferredRequest(string? extra = null) => new()
    {
        Mode = AiGenerationMode.Topic,
        Topic = "The French Revolution",
        LanguageName = null,
        LanguageNames = Languages,
        CategoryNames = Categories,
        DifficultyNames = ["Easy", "Medium", "Hard"],
        QuestionCount = 8,
        AllowedTypes = ["MultipleChoice", "TrueFalse"],
        ExtraInstructions = extra,
    };

    /// <summary>The user overrode the language in Advanced.</summary>
    private static AiGenerationRequest ExplicitLanguageRequest() =>
        InferredRequest() with { LanguageName = "German" };

    private static AiGenerationRequest SourceRequest() => new()
    {
        Mode = AiGenerationMode.Source,
        SourceText = "Photosynthesis converts light energy into chemical energy.",
        LanguageName = "English",
        LanguageNames = Languages,
        CategoryNames = Categories,
        DifficultyNames = ["Easy", "Hard"],
        QuestionCount = 3,
        AllowedTypes = ["TypeTheAnswer"],
    };

    [Fact]
    public void ContainsTheWordJson_SoTheProvidersJsonModeAccepts()
    {
        // DeepSeek rejects response_format=json_object unless the prompt mentions json. The
        // provider asserts this too; this test catches it at the source instead of at runtime.
        Assert.Contains("json", Builder.Build(InferredRequest()), StringComparison.OrdinalIgnoreCase);
        Assert.Contains("json", Builder.Build(SourceRequest()), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void QuestionsNeverCarryCategoryOrLanguage()
    {
        // The invariant that survived the move to inferred quiz-level fields: a *question* is
        // always classified by the quiz it belongs to, never by the model.
        Assert.Contains(
            "Do NOT put a category or a language on an individual question",
            Builder.Build(InferredRequest()));
    }

    [Fact]
    public void AsksForATitle()
    {
        Assert.Contains("\"title\": string", Builder.Build(InferredRequest()));
    }

    [Fact]
    public void OnlyOffersCategoryNamesItWasGiven()
    {
        var prompt = Builder.Build(InferredRequest());

        Assert.Contains("\"History\" | \"Science\" | \"Sport\"", prompt);
        // Null is an allowed answer: a bad fit must not become an invented category.
        Assert.Contains("use null", prompt);
    }

    [Fact]
    public void OmitsTheCategoryFieldEntirely_WhenNoCategoriesSupplied()
    {
        // The caller keeps the option of choosing the category themselves.
        var prompt = Builder.Build(InferredRequest() with { CategoryNames = [] });

        Assert.DoesNotContain("\"category\"", prompt);
    }

    [Fact]
    public void AsksTheModelToPickTheLanguage_WhenTheUserDidNot()
    {
        var prompt = Builder.Build(InferredRequest());

        Assert.Contains("\"language\": \"English\" | \"Albanian\" | \"German\"", prompt);
        Assert.Contains("SUBJECT is written in", prompt);
    }

    [Fact]
    public void DoesNotAskTheModelToPickTheLanguage_WhenTheUserAlreadyDid()
    {
        // An explicit choice is an instruction, not a suggestion — asking anyway invites the
        // model to overrule the user.
        var prompt = Builder.Build(ExplicitLanguageRequest());

        Assert.DoesNotContain("\"language\":", prompt);
        Assert.Contains("in German", prompt);
    }

    [Fact]
    public void OnlyRequestsTheDifficultyNamesItWasGiven()
    {
        var prompt = Builder.Build(InferredRequest());

        Assert.Contains("\"Easy\" | \"Medium\" | \"Hard\"", prompt);
        Assert.DoesNotContain("Expert", prompt);
    }

    [Fact]
    public void OnlyExplainsTheTypesItWasGiven()
    {
        var prompt = Builder.Build(SourceRequest());

        Assert.Contains("\"TypeTheAnswer\" also requires", prompt);
        Assert.DoesNotContain("\"MultipleChoice\" also requires", prompt);
    }

    [Fact]
    public void NeverAsksForAllowPartialMatch()
    {
        // A grading rule the author owns, not content the model can judge.
        // See docs/quiz/typed-answer-matching.md.
        Assert.DoesNotContain("allowPartialMatch", Builder.Build(SourceRequest()));
    }

    [Fact]
    public void SourceMode_FencesTheMaterialAndDemandsItBeTheOnlyBasis()
    {
        var prompt = Builder.Build(SourceRequest());

        Assert.Contains("SOURCE MATERIAL:", prompt);
        Assert.Contains("Base every question strictly on the source material", prompt);
        Assert.Contains("Photosynthesis converts light energy", prompt);
    }

    [Fact]
    public void TopicMode_SteersAwayFromKnowledgeThatGoesStale()
    {
        // The model is recalling facts here, so the confident-wrong answer is the failure mode.
        var prompt = Builder.Build(InferredRequest());

        Assert.Contains("recent events", prompt);
        Assert.Contains("well-established, verifiable facts", prompt);
    }

    [Fact]
    public void RequestedCountIsStated()
    {
        Assert.Contains("EXACTLY 8 quiz question(s)", Builder.Build(InferredRequest()));
    }

    [Fact]
    public void ExtraInstructions_AppearOnlyWhenSupplied()
    {
        Assert.DoesNotContain("Additional instructions", Builder.Build(InferredRequest()));
        Assert.Contains("focus on dates", Builder.Build(InferredRequest("focus on dates")));
    }

    [Fact]
    public void RulesAreNumberedContiguously_WhateverTheOptionalOnesDo()
    {
        // Rules used to be hand-numbered, so an optional rule in the middle silently renumbered
        // everything after it. Two configurations that include different optional rules must
        // both still read 1, 2, 3, … with no gaps or repeats.
        AssertContiguousRules(Builder.Build(InferredRequest("focus on dates")));
        AssertContiguousRules(Builder.Build(SourceRequest()));
        AssertContiguousRules(Builder.Build(InferredRequest() with { CategoryNames = [] }));
    }

    private static void AssertContiguousRules(string prompt)
    {
        var expected = 1;
        foreach (var line in prompt.Split('\n'))
        {
            var prefix = $"{expected}. ";
            if (line.StartsWith(prefix, StringComparison.Ordinal)) expected++;
        }

        // Four rules is the floor for any configuration; fewer means the scan matched nothing.
        Assert.True(expected > 4, $"Expected contiguous numbering, stopped at rule {expected}.");
    }

    [Fact]
    public void SupportedTypes_MatchTheTypesTheBuilderCanExplain()
    {
        // If these ever diverge, the prompt would request a type it never describes.
        Assert.Equal(
            new[] { "MultipleChoice", "TrueFalse", "TypeTheAnswer" }.OrderBy(t => t),
            AiPromptBuilder.SupportedTypes.OrderBy(t => t));
    }
}
