using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Visibility;

/// <summary>
/// The global query filter on <c>QuestionBase</c> — who is allowed to load a question at all.
///
/// <para><b>Why this file exists.</b> A Public quiz whose questions are Private was unplayable for
/// anonymous visitors, and it reached production. Rule 4 of the filter ("the question is in a quiz
/// you can see") opened with <c>_current.UserId != null &amp;&amp;</c> wrapping both halves of its
/// OR, so a guest short-circuited to false before the <c>Status == Public</c> half was ever
/// evaluated. Nothing threw at that point: the <c>QuizQuestion</c> join row has no filter, so the
/// row still loaded with its <c>Question</c> navigation null — query filters apply to included
/// navigations — and the crash landed later, as a NullReferenceException inside
/// <c>ToCurrentQuestionDto</c>, reported as a 500 from <c>next-question</c>.</para>
///
/// <para>Both creation paths make questions Private (the AI import in
/// <c>QuizService.BuildAiQuestionEntity</c>, and the manual builder's <c>DEFAULT_NEW_*</c>), so
/// this was every public quiz built from new questions, not an AI quirk. The guest case is the one
/// nobody ran, which is exactly why it gets a test.</para>
///
/// <para>EF InMemory is fine here: query filters are an EF-level concern, not a provider one —
/// unlike the quota advisory lock, which genuinely needs Postgres (generation flow §9.9).</para>
/// </summary>
public class QuestionVisibilityFilterTests
{
    private static readonly Guid OwnerId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid StrangerId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    /// <summary>All contexts in one test must share a database name to see the same rows.</summary>
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

    /// <summary>
    /// A Public quiz owned by <see cref="OwnerId"/> holding one Private question — the exact shape
    /// both the AI import and the manual builder produce.
    /// </summary>
    private static string SeedPublicQuizWithPrivateQuestion()
    {
        var dbName = Guid.NewGuid().ToString();

        // Seeded as an admin so the filters don't hide the rows from the seeding context itself.
        using var seed = ContextAs(dbName, OwnerId, isAdmin: true);

        seed.Add(new Quiz
        {
            Id = 1,
            Title = "Game of Thrones 101",
            Status = QuizStatus.Public,
            UserId = OwnerId,
            Version = 1,
        });

        seed.Add(new TrueFalseQuestion
        {
            Id = 1,
            Text = "Winterfell is in the North.",
            CorrectAnswer = true,
            Visibility = QuestionVisibility.Private,
            UserId = OwnerId,
        });

        seed.Add(new QuizQuestion
        {
            Id = 1,
            QuizId = 1,
            QuestionId = 1,
            OrderInQuiz = 1,
            TimeLimitInSeconds = 30,
            PointSystem = PointSystem.Standard,
            CreatedInVersion = 1,
        });

        seed.SaveChanges();
        return dbName;
    }

    /// <summary>The regression. This is the case that 500'd.</summary>
    [Fact]
    public async Task Guest_CanSee_PrivateQuestion_InsideAPublicQuiz()
    {
        var dbName = SeedPublicQuizWithPrivateQuestion();
        await using var ctx = ContextAs(dbName, userId: null);

        var question = await ctx.Questions.FirstOrDefaultAsync(q => q.Id == 1);

        Assert.NotNull(question);
    }

    /// <summary>
    /// The same thing through the join row, which is how the play path actually loads it. This is
    /// the assertion that would have caught the real bug: the row came back fine and it was the
    /// *navigation* that was null, so asserting on the join row alone proves nothing.
    /// </summary>
    [Fact]
    public async Task Guest_LoadingTheJoinRow_GetsANonNullQuestionNavigation()
    {
        var dbName = SeedPublicQuizWithPrivateQuestion();
        await using var ctx = ContextAs(dbName, userId: null);

        var joinRow = await ctx.QuizQuestions
            .Include(qq => qq.Question)
            .FirstAsync(qq => qq.Id == 1);

        Assert.NotNull(joinRow.Question);
        Assert.Equal("Winterfell is in the North.", joinRow.Question!.Text);
    }

    /// <summary>Rule 2 — the case that always worked, and hid the bug from the owner.</summary>
    [Fact]
    public async Task Owner_CanSee_TheirOwnPrivateQuestion()
    {
        var dbName = SeedPublicQuizWithPrivateQuestion();
        await using var ctx = ContextAs(dbName, OwnerId);

        Assert.NotNull(await ctx.Questions.FirstOrDefaultAsync(q => q.Id == 1));
    }

    /// <summary>Rule 4's other half — a signed-in stranger, which also always worked.</summary>
    [Fact]
    public async Task SignedInStranger_CanSee_PrivateQuestion_InsideAPublicQuiz()
    {
        var dbName = SeedPublicQuizWithPrivateQuestion();
        await using var ctx = ContextAs(dbName, StrangerId);

        Assert.NotNull(await ctx.Questions.FirstOrDefaultAsync(q => q.Id == 1));
    }

    /// <summary>
    /// The rule the fix must NOT have loosened: a Private question in a quiz nobody may discover
    /// stays hidden from a guest. If this ever goes green-by-accident the filter has been widened
    /// too far and Draft content is leaking.
    /// </summary>
    [Fact]
    public async Task Guest_CannotSee_PrivateQuestion_InsideADraftQuiz()
    {
        var dbName = Guid.NewGuid().ToString();

        using (var seed = ContextAs(dbName, OwnerId, isAdmin: true))
        {
            seed.Add(new Quiz
            {
                Id = 2,
                Title = "Unfinished draft",
                Status = QuizStatus.Draft,
                UserId = OwnerId,
                Version = 1,
            });
            seed.Add(new TrueFalseQuestion
            {
                Id = 2,
                Text = "Nobody should read this yet.",
                CorrectAnswer = true,
                Visibility = QuestionVisibility.Private,
                UserId = OwnerId,
            });
            seed.Add(new QuizQuestion
            {
                Id = 2,
                QuizId = 2,
                QuestionId = 2,
                OrderInQuiz = 1,
                TimeLimitInSeconds = 30,
                PointSystem = PointSystem.Standard,
                CreatedInVersion = 1,
            });
            seed.SaveChanges();
        }

        await using var ctx = ContextAs(dbName, userId: null);

        Assert.Null(await ctx.Questions.FirstOrDefaultAsync(q => q.Id == 2));
    }
}
