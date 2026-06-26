using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices;
using QuizAPI.Data;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Grading;

/// <summary>
/// Correctness tests for instant grading (<see cref="AnswerGradingService.GradeAnswerAsync"/>),
/// the path that decides whether a submitted answer is right and how many points it is worth.
/// Uses the EF Core in-memory provider so the real grading logic runs against a real DbContext
/// without a database. Scoring math itself is covered separately in QuizScoringTests; here we
/// assert correctness rules per question type plus the timeout override.
/// </summary>
public class AnswerGradingServiceTests
{
    private static ApplicationDbContext NewContext() =>
        new(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options,
            new TestCurrentUserService());

    // GradeAnswerAsync only touches the injected DbContext + logger; the scope factory and
    // Hangfire client are for the background path, so null is safe here.
    private static AnswerGradingService NewService(ApplicationDbContext ctx) =>
        new(ctx, null!, NullLogger<AnswerGradingService>.Instance, null!);

    private static UserAnswer AnswerAt(double secondsTaken, int? selectedOptionId = null, string? submitted = null)
    {
        var start = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        return new UserAnswer
        {
            QuestionStartTime = start,
            SubmittedTime = start.AddSeconds(secondsTaken),
            SelectedOptionId = selectedOptionId,
            SubmittedAnswer = submitted,
            Status = AnswerStatus.NotAnswered,
        };
    }

    // ── Multiple choice (single select) ───────────────────────────────────────

    [Fact]
    public async Task SingleSelect_CorrectOption_IsCorrectAndScored()
    {
        await using var ctx = NewContext();
        ctx.Add(new MultipleChoiceQuestion
        {
            Id = 1,
            Text = "Capital of France?",
            AllowMultipleSelections = false,
            AnswerOptions = new List<AnswerOption>
            {
                new() { Id = 11, Text = "Paris", IsCorrect = true, QuestionId = 1 },
                new() { Id = 12, Text = "Rome", IsCorrect = false, QuestionId = 1 },
            },
        });
        ctx.QuizQuestions.Add(new QuizQuestion
        {
            Id = 100, QuizId = 1, QuestionId = 1, TimeLimitInSeconds = 10, PointSystem = PointSystem.Standard,
        });
        await ctx.SaveChangesAsync();

        var result = await NewService(ctx).GradeAnswerAsync(100, AnswerAt(2, selectedOptionId: 11), default);

        Assert.True(result.IsCorrect);
        Assert.Equal(AnswerStatus.Correct, result.Status);
        Assert.Equal(14, result.Score); // 2s of 10 => +40% bonus => (int)(10 * 1.4) = 14
    }

    [Fact]
    public async Task SingleSelect_WrongOption_IsIncorrectWithZeroScore()
    {
        await using var ctx = NewContext();
        ctx.Add(new MultipleChoiceQuestion
        {
            Id = 1, Text = "Q", AllowMultipleSelections = false,
            AnswerOptions = new List<AnswerOption>
            {
                new() { Id = 11, Text = "Right", IsCorrect = true, QuestionId = 1 },
                new() { Id = 12, Text = "Wrong", IsCorrect = false, QuestionId = 1 },
            },
        });
        ctx.QuizQuestions.Add(new QuizQuestion { Id = 100, QuizId = 1, QuestionId = 1, TimeLimitInSeconds = 10 });
        await ctx.SaveChangesAsync();

        var result = await NewService(ctx).GradeAnswerAsync(100, AnswerAt(2, selectedOptionId: 12), default);

        Assert.False(result.IsCorrect);
        Assert.Equal(AnswerStatus.Incorrect, result.Status);
        Assert.Equal(0, result.Score);
    }

    // ── Multiple choice (multi select, all-or-nothing) ────────────────────────

    [Fact]
    public async Task MultiSelect_ExactCorrectSet_IsCorrect()
    {
        await using var ctx = NewContext();
        SeedMultiSelect(ctx);
        var result = await NewService(ctx).GradeAnswerAsync(200, AnswerAt(1, submitted: "21,22"), default);
        Assert.True(result.IsCorrect);
        Assert.Equal(AnswerStatus.Correct, result.Status);
        Assert.True(result.Score > 0);
    }

    [Fact]
    public async Task MultiSelect_MissingOne_IsIncorrect()
    {
        await using var ctx = NewContext();
        SeedMultiSelect(ctx);
        var result = await NewService(ctx).GradeAnswerAsync(200, AnswerAt(1, submitted: "21"), default);
        Assert.False(result.IsCorrect);
    }

    [Fact]
    public async Task MultiSelect_IncludesAWrongOption_IsIncorrect()
    {
        await using var ctx = NewContext();
        SeedMultiSelect(ctx);
        var result = await NewService(ctx).GradeAnswerAsync(200, AnswerAt(1, submitted: "21,22,23"), default);
        Assert.False(result.IsCorrect);
    }

    private static void SeedMultiSelect(ApplicationDbContext ctx)
    {
        ctx.Add(new MultipleChoiceQuestion
        {
            Id = 2, Text = "Pick the prime numbers", AllowMultipleSelections = true,
            AnswerOptions = new List<AnswerOption>
            {
                new() { Id = 21, Text = "2", IsCorrect = true, QuestionId = 2 },
                new() { Id = 22, Text = "3", IsCorrect = true, QuestionId = 2 },
                new() { Id = 23, Text = "4", IsCorrect = false, QuestionId = 2 },
            },
        });
        ctx.QuizQuestions.Add(new QuizQuestion { Id = 200, QuizId = 1, QuestionId = 2, TimeLimitInSeconds = 10 });
        ctx.SaveChanges();
    }

    // ── True / False ──────────────────────────────────────────────────────────

    [Theory]
    [InlineData("True", true)]
    [InlineData("true", true)]
    [InlineData("False", false)]
    public async Task TrueFalse_GradedAgainstCorrectAnswer(string submitted, bool expectedCorrect)
    {
        await using var ctx = NewContext();
        ctx.Add(new TrueFalseQuestion { Id = 3, Text = "The sky is blue", CorrectAnswer = true });
        ctx.QuizQuestions.Add(new QuizQuestion { Id = 300, QuizId = 1, QuestionId = 3, TimeLimitInSeconds = 10 });
        await ctx.SaveChangesAsync();

        var result = await NewService(ctx).GradeAnswerAsync(300, AnswerAt(1, submitted: submitted), default);

        Assert.Equal(expectedCorrect, result.IsCorrect);
    }

    // ── Type the answer ─────────────────────────────────────────────────────────

    [Fact]
    public async Task TypeTheAnswer_CaseInsensitiveMatch_IsCorrect()
    {
        await using var ctx = NewContext();
        SeedTypeTheAnswer(ctx, correct: "Paris", caseSensitive: false);
        var result = await NewService(ctx).GradeAnswerAsync(400, AnswerAt(1, submitted: "paris"), default);
        Assert.True(result.IsCorrect);
    }

    [Fact]
    public async Task TypeTheAnswer_CaseSensitiveMismatch_IsIncorrect()
    {
        await using var ctx = NewContext();
        SeedTypeTheAnswer(ctx, correct: "Paris", caseSensitive: true);
        var result = await NewService(ctx).GradeAnswerAsync(400, AnswerAt(1, submitted: "paris"), default);
        Assert.False(result.IsCorrect);
    }

    [Fact]
    public async Task TypeTheAnswer_MatchesAcceptableAlternative_IsCorrect()
    {
        await using var ctx = NewContext();
        SeedTypeTheAnswer(ctx, correct: "Paris", caseSensitive: false,
            acceptable: new List<string> { "Paris, France" });
        var result = await NewService(ctx).GradeAnswerAsync(400, AnswerAt(1, submitted: "paris, france"), default);
        Assert.True(result.IsCorrect);
    }

    private static void SeedTypeTheAnswer(
        ApplicationDbContext ctx, string correct, bool caseSensitive, List<string>? acceptable = null)
    {
        ctx.Add(new TypeTheAnswerQuestion
        {
            Id = 4, Text = "Capital of France?", CorrectAnswer = correct,
            IsCaseSensitive = caseSensitive, AcceptableAnswers = acceptable ?? new List<string>(),
        });
        ctx.QuizQuestions.Add(new QuizQuestion { Id = 400, QuizId = 1, QuestionId = 4, TimeLimitInSeconds = 10 });
        ctx.SaveChanges();
    }

    // ── Cross-cutting rules ─────────────────────────────────────────────────────

    [Fact]
    public async Task TimedOutAnswer_OverridesToZero_EvenIfOtherwiseCorrect()
    {
        await using var ctx = NewContext();
        ctx.Add(new TrueFalseQuestion { Id = 3, Text = "Q", CorrectAnswer = true });
        ctx.QuizQuestions.Add(new QuizQuestion { Id = 300, QuizId = 1, QuestionId = 3, TimeLimitInSeconds = 10 });
        await ctx.SaveChangesAsync();

        var answer = AnswerAt(1, submitted: "True");
        answer.Status = AnswerStatus.TimedOut;

        var result = await NewService(ctx).GradeAnswerAsync(300, answer, default);

        Assert.Equal(AnswerStatus.TimedOut, result.Status);
        Assert.Equal(0, result.Score);
    }

    [Fact]
    public async Task UnknownQuizQuestion_GradesAsIncorrectZero()
    {
        await using var ctx = NewContext();
        var result = await NewService(ctx).GradeAnswerAsync(99999, AnswerAt(1, submitted: "True"), default);
        Assert.False(result.IsCorrect);
        Assert.Equal(0, result.Score);
        Assert.Equal(AnswerStatus.Incorrect, result.Status);
    }
}
