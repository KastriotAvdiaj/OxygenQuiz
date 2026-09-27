using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService;
using QuizAPI.Data;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Playing;

/// <summary>
/// The session's total-time deadline has to leave room for reading explanations, or a player who
/// reads them runs the session out mid-quiz. The room is per question — a quiz with explanations on
/// only some questions gets exactly that much — and only with instant feedback, the one case where
/// explanations are read between questions. See docs/quiz/session-lifecycle.md, "The timing rules".
/// </summary>
public class SessionTimeoutsTests
{
    private static readonly QuizSessionOptions Options = new()
    {
        QuestionBufferSeconds = 5,
        ExplanationReadSeconds = 10,
        TotalTimeoutBufferPercentage = 0.5,
        ActivityBufferSeconds = 60,
    };

    private static TimedQuestion Q(int seconds, bool explained = false) => new(seconds, explained);

    [Fact]
    public void Without_explanations_the_deadline_is_unchanged()
    {
        // (3 × 10s + 3 × 5s buffer) = 45s, × 1.5 = 67.5s — the formula before explanations existed.
        var (total, activity) = SessionTimeouts.Calculate([Q(10), Q(10), Q(10)], instantFeedback: true, Options);

        Assert.Equal(TimeSpan.FromSeconds(67.5), total);
        Assert.Equal(TimeSpan.FromSeconds(45 + 60), activity);
    }

    [Fact]
    public void A_mixed_quiz_gets_reading_time_only_for_the_questions_that_have_an_explanation()
    {
        // Two of four explained: 4 × (10 + 5) + 2 × 10 = 80s expected.
        Assert.Equal(80, SessionTimeouts.ExpectedSeconds(
            [Q(10, true), Q(10), Q(10, true), Q(10)], instantFeedback: true, Options));
    }

    [Fact]
    public void Without_instant_feedback_explanations_add_nothing()
    {
        // Explanations are only shown in the results then — nothing is read between questions.
        Assert.Equal(
            SessionTimeouts.ExpectedSeconds([Q(10), Q(10)], instantFeedback: false, Options),
            SessionTimeouts.ExpectedSeconds([Q(10, true), Q(10, true)], instantFeedback: false, Options));
    }

    [Fact]
    public void A_player_who_reads_every_explanation_for_the_full_allowance_finishes_inside_the_deadline()
    {
        // The case that used to fail: ten 5-second questions, every one used in full, then every
        // explanation held for as long as the client will ever hold it.
        var questions = Enumerable.Range(0, 10).Select(_ => Q(5, true)).ToList();
        var (total, _) = SessionTimeouts.Calculate(questions, instantFeedback: true, Options);

        var worstCasePlay = TimeSpan.FromSeconds(questions.Count * (5 + Options.ExplanationReadSeconds));

        Assert.True(worstCasePlay < total, $"played {worstCasePlay}, deadline {total}");
    }

    [Fact]
    public void Reading_time_only_ever_widens_the_activity_timeout()
    {
        // ADR 0008: the activity timeout may be too generous, never too tight.
        var plain = SessionTimeouts.Calculate([Q(30), Q(30)], instantFeedback: true, Options).ActivityTimeout;
        var explained = SessionTimeouts.Calculate([Q(30, true), Q(30, true)], instantFeedback: true, Options).ActivityTimeout;

        Assert.True(explained > plain);
        Assert.True(plain >= TimeSpan.FromSeconds(60), "still covers the whole walk");
    }

    // ── Through the service: the inputs have to reach the arithmetic ─────────────────────────

    private static ApplicationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options,
            new TestCurrentUserService());

    private static Guid Seed(ApplicationDbContext ctx, bool explained, int startedSecondsAgo)
    {
        var category = new QuestionCategory { Id = 1, Name = "General" };
        var quiz = new Quiz { Id = 1, Title = "Q", CategoryId = 1, Category = category, Version = 1, ShowFeedbackImmediately = true };
        ctx.AddRange(category, quiz);

        for (var i = 1; i <= 10; i++)
        {
            var q = new TrueFalseQuestion
            {
                Id = i, Text = $"Q{i}", Type = QuestionType.TrueFalse, CorrectAnswer = true,
                Visibility = QuestionVisibility.Private,
                Explanation = explained ? "Because." : null,
            };
            ctx.Add(q);
            ctx.Add(new QuizQuestion
            {
                Id = i, QuizId = 1, Quiz = quiz, QuestionId = i, Question = q,
                OrderInQuiz = i, TimeLimitInSeconds = 5, CreatedInVersion = 1,
            });
        }

        var now = DateTime.UtcNow;
        var session = new QuizSession
        {
            Id = Guid.NewGuid(), QuizId = 1, Quiz = quiz, UserId = Guid.NewGuid(), QuizVersion = 1,
            StartTime = now.AddSeconds(-startedSecondsAgo),
            CurrentQuizQuestionId = 10, CurrentQuestionStartTime = now.AddSeconds(-2),
        };
        ctx.Add(session);
        ctx.SaveChanges();
        return session.Id;
    }

    private static async Task<bool> IsAbandonedFromAFreshContext(Func<ApplicationDbContext, Guid> seed)
    {
        // Seed in one context, judge in another holding only the session row — the path where the
        // service has to fetch the questions (and their explanations) itself.
        var name = Guid.NewGuid().ToString();
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(name).Options;

        Guid id;
        using (var seedCtx = new ApplicationDbContext(opts, new TestCurrentUserService())) id = seed(seedCtx);

        using var ctx = new ApplicationDbContext(opts, new TestCurrentUserService());
        var session = ctx.QuizSessions.IgnoreQueryFilters().Single(s => s.Id == id);
        var service = new SessionAbandonmentService(ctx, NullLogger<SessionAbandonmentService>.Instance,
            Microsoft.Extensions.Options.Options.Create(Options));
        return await service.IsSessionAbandonedAsync(session);
    }

    [Fact]
    public async Task A_quiz_read_at_full_allowance_is_not_abandoned_but_the_same_quiz_without_explanations_would_be()
    {
        // 160s in. Without explanations the deadline is 10 × (5s + 5s buffer) × 1.5 = 150s, so the
        // session is gone; with them it is 10 × (5 + 5 + 10) × 1.5 = 300s, so it is live.
        Assert.False(await IsAbandonedFromAFreshContext(ctx => Seed(ctx, explained: true, startedSecondsAgo: 160)));
        Assert.True(await IsAbandonedFromAFreshContext(ctx => Seed(ctx, explained: false, startedSecondsAgo: 160)));
    }
}
