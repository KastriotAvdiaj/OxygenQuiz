using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using QuizAPI.Controllers.Users.Services.UserStatsService;
using QuizAPI.Data;
using QuizAPI.Models.Quiz;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Stats;

/// <summary>
/// Tests for the profile play-stats aggregation. These pin down the inclusion rules that are easy
/// to get wrong and impossible to notice when wrong: guest sessions must never appear in anyone's
/// stats, abandoned sessions must not drag the score average down, and only graded answers may
/// count toward accuracy.
/// Uses the EF Core in-memory provider, like the grading tests.
/// </summary>
public class UserStatsServiceTests
{
    private static readonly DateTime Start = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    private static ApplicationDbContext NewContext() =>
        new(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options,
            new TestCurrentUserService());

    private static UserStatsService NewService(ApplicationDbContext ctx) =>
        new(ctx, NullLogger<UserStatsService>.Instance);

    private static QuizSession Session(
        Guid userId,
        int quizId = 1,
        int totalScore = 0,
        bool isCompleted = true,
        bool isGuest = false,
        AbandonmentReason? abandoned = null,
        DateTime? startTime = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            QuizId = quizId,
            TotalScore = totalScore,
            IsCompleted = isCompleted,
            IsGuestSession = isGuest,
            AbandonmentReason = abandoned,
            AbandonedAt = abandoned == null ? null : startTime ?? Start,
            StartTime = startTime ?? Start,
        };

    private static UserAnswer Answer(
        QuizSession session,
        AnswerStatus status,
        double? secondsTaken = null) =>
        new()
        {
            SessionId = session.Id,
            QuizSession = session,
            Status = status,
            QuestionStartTime = Start,
            SubmittedTime = secondsTaken.HasValue ? Start.AddSeconds(secondsTaken.Value) : null,
        };

    [Fact]
    public async Task NoSessions_ReturnsZeroedStats_NotAnError()
    {
        await using var ctx = NewContext();
        var result = await NewService(ctx).GetUserQuizStatsAsync(Guid.NewGuid());

        Assert.True(result.IsSuccess);
        Assert.Equal(0, result.Data!.QuizzesPlayed);
        Assert.Equal(0, result.Data.AverageScore);
        Assert.Equal(0, result.Data.AccuracyPercent);
        Assert.Null(result.Data.LastPlayedAt);
    }

    [Fact]
    public async Task CountsCompletedSessions_AndAveragesTheirScores()
    {
        var userId = Guid.NewGuid();
        await using var ctx = NewContext();
        ctx.QuizSessions.AddRange(
            Session(userId, quizId: 1, totalScore: 1000),
            Session(userId, quizId: 2, totalScore: 2000));
        await ctx.SaveChangesAsync();

        var stats = (await NewService(ctx).GetUserQuizStatsAsync(userId)).Data!;

        Assert.Equal(2, stats.QuizzesPlayed);
        Assert.Equal(2, stats.DistinctQuizzesPlayed);
        Assert.Equal(1500, stats.AverageScore);
        Assert.Equal(2000, stats.BestScore);
    }

    [Fact]
    public async Task ReplayingTheSameQuiz_CountsTwice_ButAsOneDistinctQuiz()
    {
        var userId = Guid.NewGuid();
        await using var ctx = NewContext();
        ctx.QuizSessions.AddRange(
            Session(userId, quizId: 7, totalScore: 1000),
            Session(userId, quizId: 7, totalScore: 1400));
        await ctx.SaveChangesAsync();

        var stats = (await NewService(ctx).GetUserQuizStatsAsync(userId)).Data!;

        Assert.Equal(2, stats.QuizzesPlayed);
        Assert.Equal(1, stats.DistinctQuizzesPlayed);
    }

    [Fact]
    public async Task GuestSessions_AreExcludedEntirely()
    {
        var userId = Guid.NewGuid();
        await using var ctx = NewContext();
        ctx.QuizSessions.AddRange(
            Session(userId, totalScore: 1000),
            Session(userId, totalScore: 5000, isGuest: true));
        await ctx.SaveChangesAsync();

        var stats = (await NewService(ctx).GetUserQuizStatsAsync(userId)).Data!;

        Assert.Equal(1, stats.QuizzesPlayed);
        Assert.Equal(1000, stats.AverageScore);
        Assert.Equal(1000, stats.BestScore);
    }

    [Fact]
    public async Task AbandonedSessions_AreCountedSeparately_AndKeptOutOfScoreAverages()
    {
        var userId = Guid.NewGuid();
        await using var ctx = NewContext();
        ctx.QuizSessions.AddRange(
            Session(userId, totalScore: 1000),
            // Abandoned sessions are also flagged IsCompleted by the cleanup path — the
            // AbandonmentReason is what disqualifies them, not the completion flag.
            Session(userId, totalScore: 10, abandoned: AbandonmentReason.Timeout));
        await ctx.SaveChangesAsync();

        var stats = (await NewService(ctx).GetUserQuizStatsAsync(userId)).Data!;

        Assert.Equal(1, stats.QuizzesPlayed);
        Assert.Equal(1, stats.QuizzesAbandoned);
        Assert.Equal(1000, stats.AverageScore); // not (1000 + 10) / 2
    }

    [Fact]
    public async Task AnotherUsersSessions_AreNeverIncluded()
    {
        var userId = Guid.NewGuid();
        await using var ctx = NewContext();
        ctx.QuizSessions.AddRange(
            Session(userId, totalScore: 1000),
            Session(Guid.NewGuid(), totalScore: 9000));
        await ctx.SaveChangesAsync();

        var stats = (await NewService(ctx).GetUserQuizStatsAsync(userId)).Data!;

        Assert.Equal(1, stats.QuizzesPlayed);
        Assert.Equal(1000, stats.BestScore);
    }

    [Fact]
    public async Task Accuracy_CountsOnlyGradedAnswers()
    {
        var userId = Guid.NewGuid();
        await using var ctx = NewContext();
        var session = Session(userId, totalScore: 1000);
        ctx.QuizSessions.Add(session);
        ctx.UserAnswers.AddRange(
            Answer(session, AnswerStatus.Correct, 1),
            Answer(session, AnswerStatus.Correct, 2),
            Answer(session, AnswerStatus.Incorrect, 3),
            Answer(session, AnswerStatus.TimedOut),          // graded, counts against accuracy
            Answer(session, AnswerStatus.Pending, 4),        // not a result yet
            Answer(session, AnswerStatus.NotAnswered));      // no attempt
        await ctx.SaveChangesAsync();

        var stats = (await NewService(ctx).GetUserQuizStatsAsync(userId)).Data!;

        Assert.Equal(4, stats.TotalQuestionsAnswered);
        Assert.Equal(2, stats.TotalCorrectAnswers);
        Assert.Equal(50, stats.AccuracyPercent);
    }

    [Fact]
    public async Task AverageAnswerTime_UsesSubmittedMinusStart_AndIgnoresUnsubmitted()
    {
        var userId = Guid.NewGuid();
        await using var ctx = NewContext();
        var session = Session(userId, totalScore: 1000);
        ctx.QuizSessions.Add(session);
        ctx.UserAnswers.AddRange(
            Answer(session, AnswerStatus.Correct, 2),
            Answer(session, AnswerStatus.Incorrect, 4),
            Answer(session, AnswerStatus.TimedOut));  // null SubmittedTime — no elapsed to average
        await ctx.SaveChangesAsync();

        var stats = (await NewService(ctx).GetUserQuizStatsAsync(userId)).Data!;

        Assert.Equal(3, stats.TotalQuestionsAnswered);
        Assert.Equal(3, stats.AverageAnswerTimeSeconds); // (2 + 4) / 2
    }

    [Fact]
    public async Task LastPlayedAt_IsTheMostRecentSessionStart_IncludingUnfinishedOnes()
    {
        var userId = Guid.NewGuid();
        var latest = Start.AddDays(5);
        await using var ctx = NewContext();
        ctx.QuizSessions.AddRange(
            Session(userId, totalScore: 1000, startTime: Start),
            Session(userId, isCompleted: false, startTime: latest));
        await ctx.SaveChangesAsync();

        var stats = (await NewService(ctx).GetUserQuizStatsAsync(userId)).Data!;

        Assert.Equal(latest, stats.LastPlayedAt);
        Assert.Equal(1, stats.QuizzesPlayed); // the in-progress one isn't a "play" yet
    }
}
