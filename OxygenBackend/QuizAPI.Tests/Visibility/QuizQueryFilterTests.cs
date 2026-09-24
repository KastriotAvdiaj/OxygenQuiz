using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models.Quiz;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Visibility;

/// <summary>
/// The global query filter on <c>Quiz</c> is <b>soft delete only</b>. Visibility (Draft /
/// Unlisted / Public) is enforced explicitly at each entry point, never by a global filter.
///
/// <para><b>Why this file exists.</b> Until 2026-09-22 <c>ApplicationDbContext</c> declared two
/// filters on <c>Quiz</c>: a visibility rule and, further down, <c>DeletedAt == null</c>. In EF Core
/// 8 a second <c>HasQueryFilter</c> on the same entity <i>replaces</i> the first, so the visibility
/// rule never ran — and every endpoint was written, tested and shipped against a model with soft
/// delete alone, checking Draft/Unlisted/ownership itself. The dead declaration was removed rather
/// than revived. See docs/adr/0019-quiz-visibility-is-enforced-at-each-entry-point.md.</para>
///
/// <para>These tests pin both halves, so that "restoring" the filter fails here rather than in
/// production: the last one shows what a visibility filter would break.</para>
/// </summary>
public class QuizQueryFilterTests
{
    private static readonly Guid OwnerId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid StrangerId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static ApplicationDbContext ContextAs(string dbName, Guid? userId, bool isAdmin = false) =>
        new(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .Options,
            new TestCurrentUserService
            {
                UserId = userId,
                IsAuthenticated = userId is not null,
                IsAdmin = isAdmin,
            });

    private static string Seed(params Quiz[] quizzes)
    {
        var dbName = Guid.NewGuid().ToString();
        using var seed = ContextAs(dbName, OwnerId, isAdmin: true);
        seed.AddRange(quizzes);
        seed.SaveChanges();
        return dbName;
    }

    private static Quiz NewQuiz(int id, QuizStatus status, DateTime? deletedAt = null) => new()
    {
        Id = id,
        Title = $"Quiz {id}",
        Status = status,
        UserId = OwnerId,
        Version = 1,
        DeletedAt = deletedAt,
    };

    [Fact]
    public async Task SoftDeletedQuiz_IsHidden_EvenFromItsOwner()
    {
        var db = Seed(NewQuiz(1, QuizStatus.Public, deletedAt: DateTime.UtcNow));
        await using var ctx = ContextAs(db, OwnerId);

        Assert.Null(await ctx.Quizzes.FirstOrDefaultAsync(q => q.Id == 1));
    }

    [Fact]
    public async Task SoftDeletedQuiz_IsVisible_WhenFiltersAreIgnored()
    {
        var db = Seed(NewQuiz(1, QuizStatus.Public, deletedAt: DateTime.UtcNow));
        await using var ctx = ContextAs(db, OwnerId, isAdmin: true);

        Assert.NotNull(await ctx.Quizzes.IgnoreQueryFilters().FirstOrDefaultAsync(q => q.Id == 1));
    }

    /// <summary>
    /// Pins that the global filter does NOT decide visibility. A stranger reading a Draft quiz by id
    /// must be refused by the endpoint (QuizzesController.GetQuizById does this), not by EF. If this
    /// test starts failing, someone has added a visibility filter — read ADR 0019 and the next test
    /// before keeping it.
    /// </summary>
    [Theory]
    [InlineData(QuizStatus.Draft)]
    [InlineData(QuizStatus.Unlisted)]
    public async Task NonPublicQuiz_IsNotHiddenByTheGlobalFilter(QuizStatus status)
    {
        var db = Seed(NewQuiz(1, status));
        await using var ctx = ContextAs(db, StrangerId);

        Assert.NotNull(await ctx.Quizzes.FirstOrDefaultAsync(q => q.Id == 1));
    }

    /// <summary>
    /// The reason visibility cannot be a global filter. A signed-in stranger who played an Unlisted
    /// quiz through its share link owns that session, and their results and history load it with
    /// its Quiz. A visibility filter on Quiz would apply to that navigation too — query filters
    /// apply to included navigations — so the session would come back without its quiz (or not at
    /// all, through an inner join), exactly the failure shape of the 2026-08-19 QuestionBase bug.
    /// The same holds for the Hangfire sweeps and the match loop, which run with no current user.
    /// </summary>
    [Fact]
    public async Task StrangersSession_OnAnUnlistedQuiz_StillLoadsItsQuiz()
    {
        var dbName = Guid.NewGuid().ToString();
        using (var seed = ContextAs(dbName, OwnerId, isAdmin: true))
        {
            seed.Add(NewQuiz(1, QuizStatus.Unlisted));
            seed.Add(new QuizSession
            {
                Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                QuizId = 1,
                UserId = StrangerId,
                StartTime = DateTime.UtcNow,
            });
            seed.SaveChanges();
        }

        await using var ctx = ContextAs(dbName, StrangerId);
        var session = await ctx.QuizSessions
            .Include(s => s.Quiz)
            .FirstOrDefaultAsync(s => s.UserId == StrangerId);

        Assert.NotNull(session);
        Assert.NotNull(session!.Quiz);
    }
}
