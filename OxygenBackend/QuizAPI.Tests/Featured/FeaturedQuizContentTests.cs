using System.Text;
using QuizAPI.Services.FeaturedQuizzes;
using Xunit;

namespace QuizAPI.Tests.Featured;

/// <summary>
/// The shipped <c>Seed/featured-quizzes.json</c> keeps the rules agreed for featured quizzes
/// (docs/quiz/featured-quizzes.md, "The content rules"), and the validator catches each way of
/// breaking them. A bad edit to the file fails here instead of being skipped at startup.
/// </summary>
public class FeaturedQuizContentTests
{
    private static readonly string[] Categories = { "geography", "general-knowledge", "science", "history" };
    private static readonly string[] Levels = { "easy", "medium", "hard", "expert" };

    [Fact]
    public void The_shipped_file_breaks_no_rule()
    {
        Assert.Empty(FeaturedQuizContent.Load().Validate());
    }

    [Fact]
    public void The_shipped_file_has_every_category_at_every_level()
    {
        var keys = FeaturedQuizContent.Load().Quizzes.Select(q => q.Key).OrderBy(k => k);
        var expected = Categories.SelectMany(c => Levels.Select(l => $"{c}-{l}")).OrderBy(k => k);
        Assert.Equal(expected, keys);
    }

    [Fact]
    public void Every_shipped_question_text_is_unique()
    {
        var texts = FeaturedQuizContent.Load().Quizzes.SelectMany(q => q.Questions).Select(q => q.Text).ToList();
        Assert.Equal(texts.Count, texts.Distinct(StringComparer.OrdinalIgnoreCase).Count());
    }

    private static FeaturedQuizContent Parse(string json) =>
        FeaturedQuizContent.Parse(new MemoryStream(Encoding.UTF8.GetBytes(json)));

    /// <summary>A valid quiz at <paramref name="level"/> with question 1 replaced by <paramref name="first"/>.</summary>
    private static string Quiz(string level, string first, int seconds)
    {
        var filler = $$"""{"type":"MultipleChoice","text":"Q","options":["a","b","c","d"],"correct":0,"seconds":{{seconds}},"explanation":"x"}""";
        var questions = string.Join(",", new[] { first }.Concat(Enumerable.Repeat(filler, 9)));
        return $$"""{"quizzes":[{"key":"k","category":"Science","difficulty":"{{level}}","title":"T","description":"D","questions":[{{questions}}]}]}""";
    }

    [Fact]
    public void A_valid_quiz_passes()
    {
        var first = """{"type":"TrueFalse","text":"Q","answer":true,"seconds":20,"explanation":"x"}""";
        Assert.Empty(Parse(Quiz("Easy", first, 20)).Validate());
    }

    [Theory]
    [InlineData("""{"type":"MultipleChoice","text":"Q","options":["a","b","c"],"correct":0,"seconds":20,"explanation":"x"}""", "exactly 4 options")]
    [InlineData("""{"type":"MultipleChoice","text":"Q","options":["a","b","c","d"],"correct":4,"seconds":20,"explanation":"x"}""", "'correct'")]
    [InlineData("""{"type":"MultipleChoice","text":"Q","options":["a","b","c","d"],"correct":0,"seconds":15,"explanation":"x"}""", "at least 20s")]
    [InlineData("""{"type":"MultipleChoice","text":"Q","options":["a","b","c","d"],"correct":0,"seconds":20,"explanation":""}""", "no explanation")]
    [InlineData("""{"type":"TypeTheAnswer","text":"Q","answer":"x","seconds":20,"explanation":"x"}""", "don't use")]
    public void An_easy_quiz_is_refused_for(string first, string expected)
    {
        var errors = Parse(Quiz("Easy", first, 20)).Validate();
        Assert.Contains(errors, e => e.Contains(expected));
    }

    [Fact]
    public void An_expert_quiz_takes_no_true_false()
    {
        var first = """{"type":"TrueFalse","text":"Q","answer":true,"seconds":35,"explanation":"x"}""";
        Assert.Contains(Parse(Quiz("Expert", first, 35)).Validate(), e => e.Contains("Expert quizzes don't use"));
    }

    [Fact]
    public void Each_level_has_its_own_time_floor()
    {
        var first = """{"type":"TypeTheAnswer","text":"Q","answer":"x","seconds":30,"explanation":"x"}""";
        Assert.Contains(Parse(Quiz("Expert", first, 35)).Validate(), e => e.Contains("at least 35s"));
    }

    [Fact]
    public void Nine_questions_is_not_a_featured_quiz()
    {
        var json = """{"quizzes":[{"key":"k","category":"Science","difficulty":"Easy","title":"T","description":"D","questions":[]}]}""";
        Assert.Contains(Parse(json).Validate(), e => e.Contains("not 10"));
    }
}
