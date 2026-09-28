using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.SubmitAnswerService;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Filtering;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Playing;

/// <summary>
/// The history list (<c>GetUserSessionsAsync</c>): paging that never promises rows it can't
/// deliver, and the filters the history page offers (docs/quiz/user-stats-history.md).
///
/// <para>Paging regression: sessions on a soft-deleted quiz were counted by <c>TotalItems</c>
/// but dropped from <c>Items</c>. The projection reads <c>s.Quiz</c>, and the <c>Quiz</c> global
/// query filter (<c>DeletedAt == null</c>) turned that into an INNER JOIN applied <em>after</em>
/// the LIMIT — so a page of 24 came back with 22 cards and a pager claiming more pages than there
/// were. Those sessions are also unreachable (their results endpoint 404s), so they are excluded
/// from both the count and the page. The in-memory provider doesn't reproduce the SQL push-down
/// exactly; the invariant guarded here is the one the UI depends on: count and items describe
/// the same set.</para>
/// </summary>
public class SessionHistoryPagingTests
{
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly DateTime Start = new(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

    private static ApplicationDbContext NewContext() =>
        new(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options,
            new TestCurrentUserService());

    private static QuizSessionService Service(ApplicationDbContext ctx) =>
        new(
            ctx,
            NullLogger<QuizSessionService>.Instance,
            new Mock<ISessionAbandonmentService>().Object,
            new Mock<IAnswerGradingService>().Object,
            new Mock<ISubmitAnswerService>().Object,
            new QuizAPI.Repositories.AssociationGameRepository(ctx));

    private static Quiz AddQuiz(ApplicationDbContext ctx, int id, string title,
        int categoryId = 1, int difficultyId = 1, int languageId = 1, bool deleted = false)
    {
        var quiz = new Quiz
        {
            Id = id,
            Title = title,
            CategoryId = categoryId,
            DifficultyId = difficultyId,
            LanguageId = languageId,
            DeletedAt = deleted ? DateTime.UtcNow : null,
        };
        ctx.Add(quiz);
        return quiz;
    }

    private static QuizSession AddSession(ApplicationDbContext ctx, Quiz quiz, int minutesAgo,
        int score = 0, bool completed = true, AbandonmentReason? abandoned = null, Guid? userId = null)
    {
        var session = new QuizSession
        {
            Id = Guid.NewGuid(),
            QuizId = quiz.Id,
            UserId = userId ?? UserId,
            StartTime = Start.AddMinutes(-minutesAgo),
            TotalScore = score,
            IsCompleted = completed,
            AbandonmentReason = abandoned,
            QuizVersion = 1,
        };
        ctx.Add(session);
        return session;
    }

    private static async Task<PagedResponse<QuizSessionSummaryDto>> Query(
        ApplicationDbContext ctx, FilterQuery query)
    {
        var result = await Service(ctx).GetUserSessionsAsync(UserId, query);
        Assert.True(result.IsSuccess);
        return result.Data!;
    }

    private static FilterQuery Q(params string[] filters) => new() { Filter = filters.ToList() };

    // ── Paging ──────────────────────────────────────────────────────────────

    private static void SeedLiveAndDeleted(ApplicationDbContext ctx)
    {
        var live = AddQuiz(ctx, 1, "Live");
        var deleted = AddQuiz(ctx, 2, "Deleted", deleted: true);
        // 30 live + 2 deleted-quiz sessions, the deleted ones near the top of page 1 as in the
        // bug report.
        for (var n = 0; n < 32; n++)
            AddSession(ctx, n is 1 or 3 ? deleted : live, minutesAgo: n);
        ctx.SaveChanges();
    }

    [Fact]
    public async Task SessionsOnDeletedQuizzes_AreNotCounted_AndPagesAreFull()
    {
        using var ctx = NewContext();
        SeedLiveAndDeleted(ctx);

        var paged = await Query(ctx, new FilterQuery { Page = 1, PageSize = 24 });

        Assert.Equal(30, paged.TotalItems);
        Assert.Equal(24, paged.Items.Count);
        Assert.All(paged.Items, s => Assert.Equal("Live", s.QuizTitle));
    }

    [Fact]
    public async Task LastPage_HoldsExactlyTheRemainder()
    {
        using var ctx = NewContext();
        SeedLiveAndDeleted(ctx);

        var paged = await Query(ctx, new FilterQuery { Page = 2, PageSize = 24 });

        Assert.Equal(2, paged.TotalPages);
        Assert.Equal(6, paged.Items.Count);
    }

    [Fact]
    public async Task PageSize_IsClampedToTheHistoryMaximum()
    {
        using var ctx = NewContext();
        SeedLiveAndDeleted(ctx);

        // FilterQuery itself allows 100; history keeps its own tighter cap.
        var paged = await Query(ctx, new FilterQuery { PageSize = 100 });

        Assert.Equal(QuizSessionService.MaxHistoryPageSize, paged.PageSize);
    }

    [Fact]
    public async Task DefaultOrder_IsNewestFirst()
    {
        using var ctx = NewContext();
        var quiz = AddQuiz(ctx, 1, "Quiz");
        AddSession(ctx, quiz, minutesAgo: 30);
        AddSession(ctx, quiz, minutesAgo: 10);
        AddSession(ctx, quiz, minutesAgo: 20);
        ctx.SaveChanges();

        var paged = await Query(ctx, new FilterQuery());

        Assert.Equal(
            paged.Items.Select(s => s.StartTime).OrderByDescending(t => t),
            paged.Items.Select(s => s.StartTime));
    }

    // ── Filters ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Search_MatchesQuizTitle_CaseInsensitively()
    {
        using var ctx = NewContext();
        AddSession(ctx, AddQuiz(ctx, 1, "World Capitals"), 1);
        AddSession(ctx, AddQuiz(ctx, 2, "Periodic Table"), 2);
        ctx.SaveChanges();

        var paged = await Query(ctx, new FilterQuery { Search = "capital" });

        Assert.Equal(["World Capitals"], paged.Items.Select(s => s.QuizTitle));
    }

    [Fact]
    public async Task QuizFacets_UseTheSameFieldNamesAsTheQuizCatalogue()
    {
        using var ctx = NewContext();
        AddSession(ctx, AddQuiz(ctx, 1, "A", categoryId: 1, difficultyId: 1, languageId: 1), 1);
        AddSession(ctx, AddQuiz(ctx, 2, "B", categoryId: 2, difficultyId: 2, languageId: 1), 2);
        AddSession(ctx, AddQuiz(ctx, 3, "C", categoryId: 3, difficultyId: 2, languageId: 2), 3);
        ctx.SaveChanges();

        // OR within a facet, AND across facets — exactly what the quiz facet panel emits.
        var paged = await Query(ctx, Q("categoryId:in:2,3", "difficultyId:in:2", "languageId:in:1"));

        Assert.Equal(["B"], paged.Items.Select(s => s.QuizTitle));
    }

    [Fact]
    public async Task Status_FollowsTheBadgePrecedence()
    {
        using var ctx = NewContext();
        var quiz = AddQuiz(ctx, 1, "Quiz");
        var done = AddSession(ctx, quiz, 1, completed: true);
        var open = AddSession(ctx, quiz, 2, completed: false);
        // Abandoned wins even when the row is also marked completed — the card shows "Abandoned".
        var gone = AddSession(ctx, quiz, 3, completed: true, abandoned: AbandonmentReason.Timeout);
        ctx.SaveChanges();

        Assert.Equal([done.Id], (await Query(ctx, Q("status:eq:Completed"))).Items.Select(s => s.Id));
        Assert.Equal([open.Id], (await Query(ctx, Q("status:eq:InProgress"))).Items.Select(s => s.Id));
        Assert.Equal([gone.Id], (await Query(ctx, Q("status:eq:Abandoned"))).Items.Select(s => s.Id));
        // The frontend sends the enum's numeric values; both spellings parse.
        Assert.Equal(2, (await Query(ctx, Q("status:in:1,2"))).TotalItems);
    }

    [Fact]
    public async Task StartTimeRange_IsHalfOpen()
    {
        using var ctx = NewContext();
        var quiz = AddQuiz(ctx, 1, "Quiz");
        AddSession(ctx, quiz, minutesAgo: 0);      // == Start
        AddSession(ctx, quiz, minutesAgo: 60);     // an hour before
        AddSession(ctx, quiz, minutesAgo: 60 * 24); // a day before
        ctx.SaveChanges();

        // The client sends "played from day X to day Y" as [start of X, start of Y+1).
        var from = Start.AddHours(-2).ToString("O");
        var to = Start.ToString("O");
        var paged = await Query(ctx, Q($"startTime:gte:{from}", $"startTime:lt:{to}"));

        Assert.Equal([Start.AddMinutes(-60)], paged.Items.Select(s => s.StartTime));
    }

    [Fact]
    public async Task ScoreSort_BreaksTiesDeterministically()
    {
        using var ctx = NewContext();
        var quiz = AddQuiz(ctx, 1, "Quiz");
        for (var n = 0; n < 6; n++) AddSession(ctx, quiz, minutesAgo: n, score: 100);
        ctx.SaveChanges();

        var query = new FilterQuery { Sort = "totalScore:desc", PageSize = 3 };
        var page1 = await Query(ctx, query);
        var page2 = await Query(ctx, new FilterQuery { Sort = "totalScore:desc", PageSize = 3, Page = 2 });

        // Every session appears exactly once across the two pages, newest first within the tie.
        var ids = page1.Items.Concat(page2.Items).Select(s => s.Id).ToList();
        Assert.Equal(6, ids.Distinct().Count());
        Assert.Equal(
            page1.Items.Concat(page2.Items).Select(s => s.StartTime).OrderByDescending(t => t),
            page1.Items.Concat(page2.Items).Select(s => s.StartTime));
    }

    [Fact]
    public async Task AccuracySort_OrdersByShareCorrect_NotByRawPoints()
    {
        using var ctx = NewContext();
        // Two quizzes of different lengths: 3/4 correct beats 1/2 correct even with fewer points.
        var four = AddQuiz(ctx, 1, "Four");
        var two = AddQuiz(ctx, 2, "Two");
        for (var i = 1; i <= 4; i++)
            ctx.Add(new QuizQuestion { Id = i, QuizId = four.Id, QuestionId = i, CreatedInVersion = 1 });
        for (var i = 5; i <= 6; i++)
            ctx.Add(new QuizQuestion { Id = i, QuizId = two.Id, QuestionId = i, CreatedInVersion = 1 });

        var high = AddSession(ctx, four, 1, score: 100);
        var low = AddSession(ctx, two, 2, score: 5000);
        foreach (var (session, ids) in new[] { (high, new[] { 1, 2, 3 }), (low, new[] { 5 }) })
            foreach (var qq in ids)
                ctx.Add(new UserAnswer
                {
                    SessionId = session.Id,
                    QuizQuestionId = qq,
                    Status = AnswerStatus.Correct,
                    QuestionStartTime = Start,
                });
        ctx.SaveChanges();

        var byAccuracy = await Query(ctx, new FilterQuery { Sort = "accuracy:desc" });
        var byPoints = await Query(ctx, new FilterQuery { Sort = "totalScore:desc" });

        Assert.Equal([high.Id, low.Id], byAccuracy.Items.Select(s => s.Id));
        Assert.Equal([low.Id, high.Id], byPoints.Items.Select(s => s.Id));
    }

    [Fact]
    public async Task Filters_CannotWidenPastTheUsersOwnSessions()
    {
        using var ctx = NewContext();
        var quiz = AddQuiz(ctx, 1, "Quiz");
        AddSession(ctx, quiz, 1);
        AddSession(ctx, quiz, 2, userId: Guid.NewGuid());
        ctx.SaveChanges();

        // quizId would match both rows; the user clamp is applied first.
        var paged = await Query(ctx, Q("quizId:eq:1"));

        Assert.Equal(1, paged.TotalItems);
    }
}
