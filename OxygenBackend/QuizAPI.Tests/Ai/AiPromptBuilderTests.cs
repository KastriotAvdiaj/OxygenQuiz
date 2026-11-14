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
        // Vendors reject response_format=json_object unless the prompt mentions json (true of
        // DeepSeek and Qwen alike). The
        // provider asserts this too; this test catches it at the source instead of at runtime.
        Assert.Contains("json", Builder.Build(InferredRequest()), StringComparison.OrdinalIgnoreCase);
        Assert.Contains("json", Builder.Build(SourceRequest()), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void AsksForPlainTextMaths_NotMarkup()
    {
        // Nothing in the app renders LaTeX or Markdown, so a model that writes "sqrt(b^2 - 4ac)"
        // or "$\frac{a}{b}$" puts that markup in front of the player as it is.
        foreach (var prompt in new[] { Builder.Build(InferredRequest()), Builder.Build(SourceRequest()) })
        {
            Assert.Contains("Do NOT use LaTeX", prompt);
            Assert.Contains("√(b² − 4ac)", prompt);
        }
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
    public void BothModes_AskForRealDistractors_NotInventedWords()
    {
        // The Phase 0 baseline found made-up Albanian distractors that were both wrong Albanian
        // and gave the answer away. Nothing in question-checks.ts can catch that.
        foreach (var prompt in new[] { Builder.Build(InferredRequest()), Builder.Build(SourceRequest()) })
            Assert.Contains("never an invented or nonsense word", prompt);
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
    public void SourceMode_AsksForAVerbatimQuoteInTheSourcesLanguage()
    {
        // parse-ai-output.ts drops a question whose quote isn't in the material, so a translated
        // or paraphrased quote would be thrown away as invented. The prompt has to say so.
        var prompt = Builder.Build(SourceRequest());

        Assert.Contains($"\"{AiPromptBuilder.SourceQuoteField}\": string", prompt);
        Assert.Contains("word for word", prompt);
        Assert.Contains("even if the questions are in a different language", prompt);
    }

    [Fact]
    public void TopicMode_DoesNotAskForAQuote()
    {
        // There is no material to quote from, and nothing to check a quote against.
        Assert.DoesNotContain(AiPromptBuilder.SourceQuoteField, Builder.Build(InferredRequest()));
    }

    [Fact]
    public void BothModes_AskForAShortExplanationInTheQuestionsLanguage()
    {
        foreach (var prompt in new[] { Builder.Build(InferredRequest()), Builder.Build(SourceRequest()) })
        {
            Assert.Contains($"\"{AiPromptBuilder.ExplanationField}\": string", prompt);
            Assert.Contains($"at most {AiPromptBuilder.ExplanationTargetLength} characters", prompt);
            Assert.Contains("same language as the question", prompt);
        }

        // In Source mode the explanation is held to the material, like the questions are.
        Assert.Contains("Use only facts from the SOURCE MATERIAL", Builder.Build(SourceRequest()));
    }

    [Fact]
    public void BothModes_AskForUnambiguousQuestionsThatDontGiveTheAnswerAway()
    {
        foreach (var prompt in new[] { Builder.Build(InferredRequest()), Builder.Build(SourceRequest()) })
        {
            Assert.Contains("only defensible answer", prompt);
            Assert.Contains("Never write the answer", prompt);
            Assert.Contains("All options must be different", prompt);
        }
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

    // ── "Add images" (docs/media/media-pipeline.md, "AI-added images") ─────────────────────

    [Fact]
    public void Without_the_switch_no_image_is_asked_for() =>
        Assert.DoesNotContain(AiPromptBuilder.ImageQueryField, Builder.Build(InferredRequest()));

    [Fact]
    public void With_the_switch_the_model_gives_a_search_phrase_never_a_url_on_only_the_questions_it_helps()
    {
        var prompt = Builder.Build(InferredRequest() with { AddImages = true });

        Assert.Contains($"\"{AiPromptBuilder.ImageQueryField}\": string", prompt); // in the shape
        Assert.Contains("Never a URL", prompt);
        Assert.Contains($"at most {AiPromptBuilder.MaxImageQueries}", prompt);
        Assert.Contains("must not give the answer away", prompt);
    }

    [Fact]
    public void A_picture_belongs_to_a_question_about_the_picture_and_is_never_decoration()
    {
        // 2026-11-14: "Which planet is closest to the Sun?" came back with a labelled picture of
        // Mercury, and a statement naming Marie Curie with her portrait.
        var prompt = Builder.Build(InferredRequest() with { AddImages = true });

        Assert.Contains("PICTURE QUESTION", prompt);
        Assert.Contains("does NOT name what the picture shows", prompt);
        Assert.Contains("never decoration", prompt);
        Assert.Contains("can be answered without looking", prompt);
        // The line that asked for a picture on anything visible is what produced the decoration.
        Assert.DoesNotContain("consider every question", prompt);
    }

    [Fact]
    public void The_shape_stays_valid_json_like_with_every_optional_field_on()
    {
        // The shape block lists the question's fields comma-separated; adding a field must not
        // leave a trailing comma or drop one between the last two.
        var prompt = Builder.Build(SourceRequest() with { AddImages = true });
        var start = prompt.IndexOf("\"type\":", StringComparison.Ordinal);
        var end = prompt.IndexOf('}', start);
        var fields = prompt[start..end].Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(l => l.Length > 0).ToList();

        Assert.All(fields.SkipLast(1), f => Assert.EndsWith(",", f));
        Assert.DoesNotContain(",", fields.Last()[^1..]);
        Assert.Contains(fields, f => f.StartsWith($"\"{AiPromptBuilder.SourceQuoteField}\""));
        Assert.Contains(fields, f => f.StartsWith($"\"{AiPromptBuilder.ImageQueryField}\""));
    }

    // ── A broad topic: several articles in one material (flow doc §2f) ───────────────────────

    private static AiGenerationRequest BroadRequest(int questions = 10, int articles = 4)
    {
        var titles = new[] { "Solar System", "French Revolution", "Amazon River", "Mount Everest", "Human heart" }
            .Take(articles).ToList();
        return InferredRequest() with
        {
            Topic = "General Knowledge",
            QuestionCount = questions,
            Grounding = new QuizAPI.Services.Ai.Sources.GroundedSource(
                "wikipedia", "General Knowledge", null,
                string.Join("\n\n", titles.Select((t, i) => $"[S{i + 1}] {t}\n{t} is a well-known subject.")),
                "English")
            {
                Parts = titles.Select(t => new QuizAPI.Services.Ai.Sources.GroundedSourcePart("wikipedia", t, null)).ToList(),
            },
        };
    }

    [Fact]
    public void ABroadTopic_IsWrittenFromItsArticlesOnly_WithAQuotePerQuestion()
    {
        var prompt = Builder.Build(BroadRequest());

        Assert.Contains("the openings of 4 Wikipedia articles", prompt);
        Assert.Contains("a quiz about \"General Knowledge\"", prompt);
        Assert.Contains("based ONLY on it", prompt);
        // Same contract as one article, so the parser's quote check needs no second path.
        Assert.Contains($"\"{AiPromptBuilder.SourceQuoteField}\": string", prompt);
        Assert.Contains("SOURCE MATERIAL:", prompt);
        Assert.Contains("[S3] Amazon River", prompt);
        Assert.DoesNotContain("SUBJECT:", prompt);
    }

    [Theory]
    [InlineData(10, 4, 4)]  // ceil(10/4) + 1
    [InlineData(10, 5, 3)]
    [InlineData(5, 5, 2)]   // never below two: one per article leaves no room when some are thin
    [InlineData(30, 3, 11)]
    public void ABroadTopic_SpreadsItsQuestionsAcrossTheArticles(int questions, int articles, int most)
    {
        var prompt = Builder.Build(BroadRequest(questions, articles));

        Assert.Contains($"is {articles} separate articles", prompt);
        Assert.Contains($"take at most {most} question(s) from any one article", prompt);
        Assert.Contains("never copy a marker line as a quote", prompt);
    }

    [Fact]
    public void OneArticle_GetsNoSpreadRule()
    {
        var one = InferredRequest() with
        {
            Grounding = new QuizAPI.Services.Ai.Sources.GroundedSource(
                "wikipedia", "French Revolution", null, "The French Revolution began in 1789.", "English"),
        };

        var prompt = Builder.Build(one);

        Assert.Contains("the opening of the Wikipedia article \"French Revolution\"", prompt);
        Assert.DoesNotContain("separate articles", prompt);
    }
}
