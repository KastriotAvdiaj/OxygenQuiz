using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Common;
using QuizAPI.Controllers.Image.Services;
using QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.SubmitAnswerService;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Exceptions;
using QuizAPI.Mapping;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Formats;

/// <summary>
/// Every Classic entry point refuses a quiz whose <see cref="QuizFormat"/> isn't Classic.
///
/// <para><b>Why each one needs its own test.</b> An Associations quiz has no <c>QuizQuestion</c>
/// rows, and the failure without a guard is rarely an error: a session with nothing to serve would
/// be created and then complete, an update would recompute the quiz's time as the sum of no
/// questions and silently zero it. Each entry point fails its own way, so each is pinned on its
/// own. The checklist these mirror is in docs/quiz/associations.md.</para>
///
/// <para>The refusal comes <i>after</i> authorization everywhere it can, so a caller who may not see
/// a quiz learns nothing about its format; the stranger test pins that for session creation.</para>
/// </summary>
public class ClassicEntryPointGuardTests
{
    private static readonly Guid OwnerId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid StrangerId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static readonly string BoardRefusal = QuizFormatGuard.NotClassicMessage(QuizFormat.Associations);

    private static ApplicationDbContext NewContext(string? dbName = null) =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString())
                // The services open transactions; InMemory has none and would otherwise throw.
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options,
            new TestCurrentUserService());

    private static Quiz AddBoardQuiz(ApplicationDbContext ctx, QuizStatus status = QuizStatus.Public)
    {
        var quiz = new Quiz
        {
            Title = "Oxygen final",
            UserId = OwnerId,
            Status = status,
            Format = QuizFormat.Associations,
            TimeLimitInSeconds = 240,
        };
        ctx.Quizzes.Add(quiz);
        ctx.SaveChanges();
        return quiz;
    }

    /// <summary>
    /// A session row on a board quiz. None can be created through the Classic paths (that's the
    /// point), but Associations play will create them (plan §8), and then these are the rows a
    /// Classic endpoint could be handed.
    /// </summary>
    private static QuizSession AddSession(ApplicationDbContext ctx, Quiz quiz, Guid userId)
    {
        var session = new QuizSession
        {
            Id = Guid.NewGuid(),
            QuizId = quiz.Id,
            UserId = userId,
            StartTime = DateTime.UtcNow,
            CurrentQuizQuestionId = null,
        };
        ctx.QuizSessions.Add(session);
        ctx.SaveChanges();
        return session;
    }

    private static QuizSessionService SessionService(ApplicationDbContext ctx)
    {
        var abandonment = new Mock<ISessionAbandonmentService>();
        return new QuizSessionService(
            ctx,
            NullLogger<QuizSessionService>.Instance,
            abandonment.Object,
            new Mock<IAnswerGradingService>().Object,
            new Mock<ISubmitAnswerService>().Object,
            new QuizAPI.Repositories.AssociationGameRepository(ctx));
    }

    // ── Session creation ────────────────────────────────────────────────────

    [Fact]
    public async Task CreateSession_RefusesABoardQuiz()
    {
        await using var ctx = NewContext();
        var quiz = AddBoardQuiz(ctx);

        var result = await SessionService(ctx).CreateSessionAsync(
            new QuizSessionCM { QuizId = quiz.Id, UserId = StrangerId });

        Assert.False(result.IsSuccess);
        Assert.Contains(BoardRefusal, result.ValidationErrors);
        Assert.Empty(ctx.QuizSessions);
    }

    /// <summary>Authorization runs first: a stranger learns a Draft exists-or-not, never its format.</summary>
    [Fact]
    public async Task CreateSession_OnSomeoneElsesDraftBoard_GivesTheGenericRefusal()
    {
        await using var ctx = NewContext();
        var quiz = AddBoardQuiz(ctx, QuizStatus.Draft);

        var result = await SessionService(ctx).CreateSessionAsync(
            new QuizSessionCM { QuizId = quiz.Id, UserId = StrangerId });

        Assert.False(result.IsSuccess);
        Assert.DoesNotContain(BoardRefusal, result.ValidationErrors);
        Assert.Contains("Quiz not found or not available.", result.ValidationErrors);
    }

    [Fact]
    public async Task CreateGuestSession_RefusesABoardQuiz()
    {
        await using var ctx = NewContext();
        var quiz = AddBoardQuiz(ctx);

        var result = await SessionService(ctx).CreateGuestSessionAsync(quiz.Id);

        Assert.False(result.IsSuccess);
        Assert.Contains(BoardRefusal, result.ValidationErrors);
        Assert.Empty(ctx.QuizSessions);
    }

    [Fact]
    public async Task AbandonAndRestart_RefusesToCreateAClassicSessionOnABoardQuiz()
    {
        await using var ctx = NewContext();
        var quiz = AddBoardQuiz(ctx);
        var existing = AddSession(ctx, quiz, StrangerId);

        var result = await SessionService(ctx).AbandonAndCreateNewSessionAsync(
            existing.Id, new QuizSessionCM { QuizId = quiz.Id, UserId = StrangerId });

        Assert.False(result.IsSuccess);
        Assert.Contains(BoardRefusal, result.ValidationErrors);
        Assert.Single(ctx.QuizSessions);
    }

    // ── Session play ────────────────────────────────────────────────────────

    [Fact]
    public async Task NextQuestion_RefusesASessionOnABoardQuiz()
    {
        await using var ctx = NewContext();
        var session = AddSession(ctx, AddBoardQuiz(ctx), StrangerId);

        var result = await SessionService(ctx).GetNextQuestionAsync(session.Id);

        Assert.False(result.IsSuccess);
        Assert.Contains(BoardRefusal, result.ValidationErrors);
        // Nothing was stamped: a refused request must not start a question clock.
        Assert.Null(ctx.QuizSessions.Single().CurrentQuestionStartTime);
    }

    [Fact]
    public async Task ResolveAndResume_RefusesASessionOnABoardQuiz()
    {
        await using var ctx = NewContext();
        var session = AddSession(ctx, AddBoardQuiz(ctx), StrangerId);

        var result = await SessionService(ctx).ResolveAndResumeAsync(session.Id, StrangerId);

        Assert.False(result.IsSuccess);
        Assert.Contains(BoardRefusal, result.ValidationErrors);
    }

    [Fact]
    public async Task SubmitAnswer_RefusesASessionOnABoardQuiz()
    {
        await using var ctx = NewContext();
        var session = AddSession(ctx, AddBoardQuiz(ctx), StrangerId);
        var sut = new SubmitAnswerService(
            ctx,
            new Mock<IAnswerGradingService>().Object,
            NullLogger<SubmitAnswerService>.Instance,
            Options.Create(new QuizSessionOptions()));

        var result = await sut.SubmitAnswerAsync(new UserAnswerCM
        {
            SessionId = session.Id,
            QuizQuestionId = 1,
            SubmittedAnswer = "anything",
        });

        Assert.False(result.IsSuccess);
        Assert.Contains(BoardRefusal, result.ValidationErrors);
        Assert.Empty(ctx.UserAnswers);
    }

    // ── Editing ─────────────────────────────────────────────────────────────

    private static QuizService QuizServiceFor(ApplicationDbContext ctx) =>
        new(new QuizRepository(ctx),
            new Mock<IQuestionRepository>().Object,
            NullLogger<QuizService>.Instance,
            new Mock<IImageService>().Object,
            // Admin: these tests are about the Classic guards, which must hold even for someone
            // who can see an Associations quiz. The preview gate has its own tests.
            new TestCurrentUserService { UserId = OwnerId, IsAdmin = true },
            NoPlanLimits.Instance);

    /// <summary>
    /// The one that fails silently without the guard: the Classic update recomputes
    /// <c>TimeLimitInSeconds</c> as the sum of the incoming questions — none, for a board.
    /// </summary>
    [Fact]
    public async Task ClassicUpdate_RefusesABoardQuiz_AndLeavesItsTimeAlone()
    {
        var dbName = Guid.NewGuid().ToString();
        int quizId;
        await using (var seed = NewContext(dbName))
            quizId = AddBoardQuiz(seed).Id;

        await using var ctx = NewContext(dbName);
        var ex = await Assert.ThrowsAsync<AppValidationException>(() =>
            QuizServiceFor(ctx).UpdateQuizAsync(OwnerId, new QuizUM
            {
                Id = quizId,
                Title = "Renamed",
                Version = 1,
                Status = "Public",
            }));

        Assert.Equal(BoardRefusal, ex.Message);
        await using var check = NewContext(dbName);
        var stored = check.Quizzes.Single();
        Assert.Equal(240, stored.TimeLimitInSeconds);
        Assert.Equal("Oxygen final", stored.Title);
    }

    /// <summary>A stranger's update is refused as "not yours" (null → 404), before the format is looked at.</summary>
    [Fact]
    public async Task ClassicUpdate_ByAStranger_IsRefusedAsNotFound_NotByFormat()
    {
        await using var ctx = NewContext();
        var quiz = AddBoardQuiz(ctx);

        var result = await QuizServiceFor(ctx).UpdateQuizAsync(StrangerId, new QuizUM
        {
            Id = quiz.Id,
            Title = "Hijack",
            Version = 1,
        });

        Assert.Null(result);
    }

    // ── Lobby ───────────────────────────────────────────────────────────────

    /// <summary>What <c>QuizHub.SelectQuiz</c> reads to refuse a board in a lobby.</summary>
    [Fact]
    public async Task GetFormat_ReportsTheFormat_OrNullForAMissingQuiz()
    {
        await using var ctx = NewContext();
        var quiz = AddBoardQuiz(ctx, QuizStatus.Draft);

        var sut = QuizServiceFor(ctx);

        Assert.Equal(QuizFormat.Associations, await sut.GetFormatAsync(quiz.Id));
        Assert.Null(await sut.GetFormatAsync(quiz.Id + 999));
    }

    // ── The wire ────────────────────────────────────────────────────────────

    [Theory]
    [InlineData(QuizFormat.Classic, "Classic")]
    [InlineData(QuizFormat.Associations, "Associations")]
    public void SummaryAndDetailProjections_CarryTheFormatName(QuizFormat format, string expected)
    {
        // The compiled twins of ProjectSummary / ProjectDetail — the same expressions the SQL
        // projections use, run in memory (no lookup rows needed for the joins).
        var quiz = new Quiz { Title = "q", UserId = OwnerId, Format = format };

        Assert.Equal(expected, quiz.ToSummaryDto().Format);
        Assert.Equal(expected, quiz.ToDto().Format);
    }

    /// <summary>Every quiz that existed before formats is Classic: the default is the backfill.</summary>
    [Fact]
    public void ANewQuiz_IsClassicUnlessToldOtherwise()
    {
        Assert.Equal(QuizFormat.Classic, new Quiz().Format);
        Assert.Equal(0, (int)QuizFormat.Classic);
    }

    // ── The guard itself ────────────────────────────────────────────────────

    [Fact]
    public void EnsureClassic_PassesClassic_AndThrowsForAnythingElse()
    {
        QuizFormatGuard.EnsureClassic(QuizFormat.Classic);

        var ex = Assert.Throws<AppValidationException>(() => QuizFormatGuard.EnsureClassic(QuizFormat.Associations));
        Assert.Equal(BoardRefusal, ex.Message);
    }

    [Fact]
    public void EnsureFormat_ThrowsOnAMismatch()
    {
        QuizFormatGuard.EnsureFormat(QuizFormat.Associations, QuizFormat.Associations);
        Assert.Throws<AppValidationException>(() =>
            QuizFormatGuard.EnsureFormat(QuizFormat.Classic, QuizFormat.Associations));
    }
}
