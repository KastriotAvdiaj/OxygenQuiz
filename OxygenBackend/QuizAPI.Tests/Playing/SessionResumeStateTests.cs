using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.ManyToManyTables;
using QuizAPI.Mapping;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Playing;

/// <summary>
/// <c>QuizSessionDto.ResumeState</c> is what lets the "Session In Progress" screen show the clock
/// still running instead of a snapshot that was stale on arrival (docs/quiz/session-resume-screen.md).
/// The client burns overflow seconds through <c>PendingQuestions</c> exactly as
/// <c>ResolveAndResumeAsync</c> does, so the projection has one job: hand back the same set, in the
/// same order, that the resume walk itself would iterate.
///
/// <para>Every test below is a way for those two to drift apart. An extra row here (an answered
/// question, or one belonging to a version this session never played) makes the screen promise the
/// player questions that resume will not give them; a missing one makes it under-count what they
/// are about to lose. Both are silent — the numbers still look plausible.</para>
///
/// <para>Uses the EF Core in-memory provider, like the grading and stats tests.</para>
/// </summary>
public class SessionResumeStateTests
{
    private static readonly DateTime Start = new(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

    private static ApplicationDbContext NewContext() =>
        new(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options,
            new TestCurrentUserService());

    /// <summary>
    /// A quiz whose join rows are `(order, timeLimit, createdInVersion, removedInVersion)`, plus a
    /// session on it. Deliberately builds the object graph rather than going through the services:
    /// the thing under test is the projection, and a service that seeds "correctly" would hide a
    /// projection that only reads correctly-shaped data.
    /// </summary>
    private static QuizSession Seed(
        ApplicationDbContext ctx,
        (int Order, int TimeLimit, int CreatedIn, int? RemovedIn)[] rows,
        int sessionVersion = 1,
        bool isCompleted = false)
    {
        var category = new QuestionCategory { Id = 1, Name = "General" };
        var quiz = new Quiz
        {
            Id = 1,
            Title = "Chemistry Basics",
            CategoryId = category.Id,
            Category = category,
            Version = sessionVersion,
        };

        ctx.Add(category);
        ctx.Add(quiz);

        var id = 1;
        foreach (var (order, timeLimit, createdIn, removedIn) in rows)
        {
            var question = new TrueFalseQuestion
            {
                Id = id,
                Text = $"Question {order}",
                Type = QuestionType.TrueFalse,
                CorrectAnswer = true,
            };
            ctx.Add(question);
            ctx.Add(new QuizQuestion
            {
                Id = id,
                QuizId = quiz.Id,
                Quiz = quiz,
                QuestionId = question.Id,
                Question = question,
                OrderInQuiz = order,
                TimeLimitInSeconds = timeLimit,
                CreatedInVersion = createdIn,
                RemovedInVersion = removedIn,
            });
            id++;
        }

        var session = new QuizSession
        {
            Id = Guid.NewGuid(),
            QuizId = quiz.Id,
            Quiz = quiz,
            UserId = Guid.NewGuid(),
            StartTime = Start,
            QuizVersion = sessionVersion,
            IsCompleted = isCompleted,
        };
        ctx.Add(session);
        ctx.SaveChanges();

        return session;
    }

    private static void Answer(ApplicationDbContext ctx, QuizSession session, int quizQuestionId)
    {
        ctx.Add(new UserAnswer
        {
            SessionId = session.Id,
            QuizQuestionId = quizQuestionId,
            Status = AnswerStatus.Correct,
            QuestionStartTime = Start,
            SubmittedTime = Start.AddSeconds(3),
        });
        ctx.SaveChanges();
    }

    private static QuizAPI.DTOs.Quiz.QuizSessionDto Project(ApplicationDbContext ctx, Guid sessionId) =>
        ctx.QuizSessions
            .Where(s => s.Id == sessionId)
            .AsNoTracking()
            .Select(QuizSessionMappers.ProjectSession)
            .Single();

    [Fact]
    public void PendingQuestions_ArePlayOrder_WithTheirOwnTimeLimits()
    {
        using var ctx = NewContext();
        var session = Seed(ctx, [(1, 10, 1, null), (2, 20, 1, null), (3, 30, 1, null)]);

        var state = Project(ctx, session.Id).ResumeState;

        Assert.NotNull(state);
        // Order matters more than it looks: the client walks this list front to back burning
        // overflow, so a different order means a different landing question.
        Assert.Equal([10, 20, 30], state!.PendingQuestions.Select(q => q.TimeLimitInSeconds));
    }

    [Fact]
    public void AnsweredQuestions_AreExcluded()
    {
        using var ctx = NewContext();
        var session = Seed(ctx, [(1, 10, 1, null), (2, 20, 1, null), (3, 30, 1, null)]);
        Answer(ctx, session, quizQuestionId: 1);

        var state = Project(ctx, session.Id).ResumeState;

        Assert.Equal([2, 3], state!.PendingQuestions.Select(q => q.QuizQuestionId));
    }

    [Fact]
    public void OnlyRowsVisibleToTheSessionsPinnedVersion_AreIncluded()
    {
        using var ctx = NewContext();
        // A session pinned to v1: it never sees the row added in v2, and still sees the row
        // retired in v2 (docs/quiz/quiz-editing.md).
        var session = Seed(
            ctx,
            [(1, 10, 1, null), (2, 20, 1, 2), (3, 30, 2, null)],
            sessionVersion: 1);

        var state = Project(ctx, session.Id).ResumeState;

        Assert.Equal([1, 2], state!.PendingQuestions.Select(q => q.QuizQuestionId));
    }

    [Fact]
    public void TheQuestionInFlight_IsCarriedWithItsStartTime()
    {
        using var ctx = NewContext();
        var session = Seed(ctx, [(1, 10, 1, null), (2, 20, 1, null)]);

        var tracked = ctx.QuizSessions.Single(s => s.Id == session.Id);
        tracked.CurrentQuizQuestionId = 1;
        tracked.CurrentQuestionStartTime = Start.AddMinutes(2);
        ctx.SaveChanges();

        var state = Project(ctx, session.Id).ResumeState;

        Assert.Equal(1, state!.CurrentQuizQuestionId);
        Assert.Equal(Start.AddMinutes(2), state.CurrentQuestionStartTime);
    }

    [Fact]
    public void ServerTimeUtc_IsStamped()
    {
        using var ctx = NewContext();
        var session = Seed(ctx, [(1, 10, 1, null)]);

        var before = DateTime.UtcNow;
        var state = Project(ctx, session.Id).ResumeState;
        var after = DateTime.UtcNow;

        // The whole clock-skew correction hangs off this value, and it is stamped by a property
        // initializer rather than the expression tree — a refactor that turned the projection into
        // something which bypasses the constructor would leave it at default(DateTime) and the
        // client would silently compute an offset of about two thousand years.
        Assert.InRange(state!.ServerTimeUtc, before, after);
    }

    [Fact]
    public void CompletedSession_HasNoResumeState()
    {
        using var ctx = NewContext();
        var session = Seed(ctx, [(1, 10, 1, null)], isCompleted: true);

        Assert.Null(Project(ctx, session.Id).ResumeState);
    }

    [Fact]
    public void SessionWithEveryQuestionAnswered_ReportsAnEmptyPendingList()
    {
        using var ctx = NewContext();
        var session = Seed(ctx, [(1, 10, 1, null), (2, 20, 1, null)]);
        Answer(ctx, session, 1);
        Answer(ctx, session, 2);

        // Not null — the session is still open, and "open with nothing left" is exactly the state
        // the client renders as "Time's Up / See Results".
        var state = Project(ctx, session.Id).ResumeState;

        Assert.NotNull(state);
        Assert.Empty(state!.PendingQuestions);
    }
}
