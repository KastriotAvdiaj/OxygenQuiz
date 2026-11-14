using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.SubmitAnswerService;
using QuizAPI.Data;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Tests.TestSupport;
using Xunit;
using QuizAPI.DTOs.Quiz;

namespace QuizAPI.Tests.Playing;

/// <summary>
/// With instant feedback, a question that times out still shows the player what the answer was
/// (docs/quiz/quiz-grading.md). For a multiple-choice question that means the result must name
/// the correct option(s) — and a timeout is the one path that never goes through grading, so
/// nothing else loads them.
///
/// <para>The seed is written through one context and the service runs on another, as in the app:
/// with a single context the options are already tracked and the bug this pins cannot show.</para>
/// </summary>
public class TimedOutAnswerKeyTests
{
    private static ApplicationDbContext NewContext(string db) =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(db)
                // The service opens a transaction; InMemory has none and would otherwise throw.
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options,
            new TestCurrentUserService());

    /// <summary>A two-question quiz with the first question on the clock. Returns the session id.</summary>
    private static Guid Seed(string db, bool instantFeedback, bool multiSelect = false)
    {
        using var ctx = NewContext(db);
        var category = new QuestionCategory { Id = 1, Name = "General" };
        var quiz = new Quiz
        {
            Id = 1, Title = "Timed", CategoryId = 1, Category = category, Version = 1,
            ShowFeedbackImmediately = instantFeedback, Format = QuizFormat.Classic,
        };
        var mc = new MultipleChoiceQuestion
        {
            Id = 1, Text = "Capital of Italy?", Type = QuestionType.MultipleChoice,
            AllowMultipleSelections = multiSelect,
            Explanation = "Rome has been Italy's capital since 1871.",
            AnswerOptions =
            {
                new AnswerOption { Id = 10, Text = "Milan", IsCorrect = false },
                new AnswerOption { Id = 11, Text = "Rome", IsCorrect = true },
                new AnswerOption { Id = 12, Text = "Roma", IsCorrect = multiSelect },
            },
        };
        var tf = new TrueFalseQuestion { Id = 2, Text = "Water boils at 50°C.", Type = QuestionType.TrueFalse };
        ctx.AddRange(category, quiz, mc, tf);
        ctx.Add(new QuizQuestion
        {
            Id = 1, QuizId = 1, Quiz = quiz, QuestionId = 1, Question = mc, OrderInQuiz = 1,
            TimeLimitInSeconds = 20, CreatedInVersion = 1,
        });
        ctx.Add(new QuizQuestion
        {
            Id = 2, QuizId = 1, Quiz = quiz, QuestionId = 2, Question = tf, OrderInQuiz = 2,
            TimeLimitInSeconds = 20, CreatedInVersion = 1,
        });
        var session = new QuizSession
        {
            Id = Guid.NewGuid(), QuizId = 1, Quiz = quiz, UserId = Guid.NewGuid(),
            StartTime = DateTime.UtcNow, QuizVersion = 1,
            CurrentQuizQuestionId = 1, CurrentQuestionStartTime = DateTime.UtcNow.AddSeconds(-21),
        };
        ctx.Add(session);
        ctx.SaveChanges();
        return session.Id;
    }

    private static SubmitAnswerService Service(ApplicationDbContext ctx) =>
        new(ctx,
            // Strict: a timeout must not be graded, and grading is what used to load the options.
            new Mock<IAnswerGradingService>(MockBehavior.Strict).Object,
            NullLogger<SubmitAnswerService>.Instance,
            Options.Create(new QuizSessionOptions()));

    private static UserAnswerCM TimedOut(Guid sessionId) =>
        new() { SessionId = sessionId, QuizQuestionId = 1, IsTimedOut = true };

    [Fact]
    public async Task A_timed_out_multiple_choice_question_names_its_correct_option()
    {
        var db = Guid.NewGuid().ToString();
        var sessionId = Seed(db, instantFeedback: true);
        await using var ctx = NewContext(db);

        var result = await Service(ctx).SubmitAnswerAsync(TimedOut(sessionId));

        Assert.True(result.IsSuccess);
        var dto = result.Data!;
        Assert.Equal(AnswerStatus.TimedOut, dto.Status);
        Assert.Equal(11, dto.CorrectOptionId);
        Assert.Equal([11], dto.CorrectOptionIds);
        Assert.Equal("Rome has been Italy's capital since 1871.", dto.Explanation);
        Assert.Equal(0, dto.ScoreAwarded);
    }

    [Fact]
    public async Task A_timed_out_multi_select_question_names_every_correct_option()
    {
        var db = Guid.NewGuid().ToString();
        var sessionId = Seed(db, instantFeedback: true, multiSelect: true);
        await using var ctx = NewContext(db);

        var dto = (await Service(ctx).SubmitAnswerAsync(TimedOut(sessionId))).Data!;

        Assert.Equal([11, 12], dto.CorrectOptionIds!.Order());
    }

    [Fact]
    public async Task Without_instant_feedback_a_timeout_reveals_nothing()
    {
        var db = Guid.NewGuid().ToString();
        var sessionId = Seed(db, instantFeedback: false);
        await using var ctx = NewContext(db);

        var dto = (await Service(ctx).SubmitAnswerAsync(TimedOut(sessionId))).Data!;

        // The quiz holds its results until the end, so the key stays out of the response.
        Assert.Null(dto.CorrectOptionId);
        Assert.Null(dto.CorrectOptionIds);
        Assert.Null(dto.Explanation);
    }
}
