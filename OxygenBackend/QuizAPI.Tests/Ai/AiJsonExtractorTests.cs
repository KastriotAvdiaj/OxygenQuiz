using QuizAPI.Services.Ai;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// The server's only look at model output. It answers exactly one question — "is there a usable
/// JSON object in here?" — because that answer decides whether retrying the model is worth a
/// second call, and whether the user's quota slot gets released.
///
/// Semantic validation is not tested here because it does not happen here: per-type rules,
/// difficulty resolution and drops-with-reasons all live in parse-ai-output.ts
/// (docs/quiz/ai-quiz-generation-plan.md §5.2).
/// </summary>
public class AiJsonExtractorTests
{
    private const string Valid = """{"questions":[{"type":"TrueFalse","text":"The sky is blue."}]}""";

    [Fact]
    public void BareJsonObject_IsExtracted()
    {
        var result = AiJsonExtractor.TryExtract(Valid);

        Assert.NotNull(result);
        Assert.Equal(1, result!.QuestionCount);
    }

    [Fact]
    public void FencedJson_IsExtracted()
    {
        // JSON mode makes fences unlikely, not impossible — and the copy-paste path,
        // which shares nothing but the same model habits, sees them constantly.
        var raw = "```json\n" + Valid + "\n```";

        var result = AiJsonExtractor.TryExtract(raw);

        Assert.NotNull(result);
        Assert.Equal(1, result!.QuestionCount);
    }

    [Fact]
    public void JsonWrappedInProse_IsExtracted()
    {
        var raw = $"Sure! Here are your questions:\n\n{Valid}\n\nLet me know if you'd like more.";

        var result = AiJsonExtractor.TryExtract(raw);

        Assert.NotNull(result);
        Assert.Equal(1, result!.QuestionCount);
    }

    [Fact]
    public void MultipleQuestions_AreCounted()
    {
        var raw = """{"questions":[{"text":"a"},{"text":"b"},{"text":"c"}]}""";

        var result = AiJsonExtractor.TryExtract(raw);

        Assert.Equal(3, result!.QuestionCount);
    }

    [Fact]
    public void EmptyQuestionsArray_IsNotUsable()
    {
        // The important one. A well-formed object with nothing in it must NOT be treated as a
        // valid empty quiz — it should cost the user nothing and trigger the retry instead.
        var result = AiJsonExtractor.TryExtract("""{"questions":[]}""");

        Assert.Null(result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("I'm sorry, I can't help with that.")]
    [InlineData("{ not json at all")]
    [InlineData("""{"questions":"not an array"}""")]
    [InlineData("""{"items":[{"text":"wrong key"}]}""")]
    [InlineData("""[{"text":"top-level array"}]""")]
    public void UnusableReplies_ReturnNull(string? raw)
    {
        Assert.Null(AiJsonExtractor.TryExtract(raw));
    }

    [Fact]
    public void TruncatedJson_ReturnsNull()
    {
        // What a hit output-token limit looks like. Must fail cleanly rather than half-parse.
        var raw = """{"questions":[{"type":"MultipleChoice","text":"Wh""";

        Assert.Null(AiJsonExtractor.TryExtract(raw));
    }

    [Fact]
    public void QuizLevelSuggestions_AreExtracted()
    {
        var raw = """
        {"title":"The French Revolution","category":"History","language":"English",
         "questions":[{"type":"TrueFalse","text":"a"}]}
        """;

        var result = AiJsonExtractor.TryExtract(raw);

        Assert.Equal("The French Revolution", result!.Title);
        Assert.Equal("History", result.Category);
        Assert.Equal("English", result.Language);
    }

    [Fact]
    public void MissingSuggestions_AreNullNotAnError()
    {
        // They're suggestions. A model that omits them should still produce a usable quiz —
        // the fields just stay blank for the user to fill in.
        var result = AiJsonExtractor.TryExtract(Valid);

        Assert.NotNull(result);
        Assert.Null(result!.Title);
        Assert.Null(result.Category);
        Assert.Null(result.Language);
    }

    [Theory]
    [InlineData("null")]
    [InlineData("\"\"")]
    [InlineData("\"   \"")]
    [InlineData("123")]
    [InlineData("[\"History\"]")]
    public void MalformedSuggestions_CollapseToNull(string categoryJson)
    {
        // JSON null, blank, and wrong-typed all mean the same thing to us: no suggestion.
        var raw = $$"""{"category":{{categoryJson}},"questions":[{"text":"a"}]}""";

        var result = AiJsonExtractor.TryExtract(raw);

        Assert.NotNull(result);
        Assert.Null(result!.Category);
    }

    [Fact]
    public void ExtractedJson_DropsSurroundingProse()
    {
        // The client must never receive the model's chatter — it feeds this straight to a parser.
        var result = AiJsonExtractor.TryExtract($"Here you go:\n{Valid}\nEnjoy!");

        Assert.NotNull(result);
        Assert.StartsWith("{", result!.Json);
        Assert.EndsWith("}", result.Json);
        Assert.DoesNotContain("Enjoy", result.Json);
    }
}
