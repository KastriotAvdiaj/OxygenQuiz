using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Moq;
using QuizAPI.Data;
using QuizAPI.Models.Associations;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Services.Associations;
using QuizAPI.Tests.TestSupport;

namespace QuizAPI.Tests.Associations;

/// <summary>A clock the test moves by hand.</summary>
internal sealed class TestClock : TimeProvider
{
    public DateTimeOffset Now { get; set; } = new(2026, 9, 23, 12, 0, 0, TimeSpan.Zero);
    public override DateTimeOffset GetUtcNow() => Now;
    public void Advance(double seconds) => Now = Now.AddSeconds(seconds);
}

/// <summary>
/// An in-memory database holding one Associations quiz with the <see cref="AssociationBoardServiceTests.Board"/>
/// content, and a way to build the play service over it. Each <see cref="Service"/> call gets a
/// fresh DbContext, the way each HTTP request does — so nothing passes between calls except what
/// was saved.
/// </summary>
internal sealed class PlayWorld
{
    public static readonly Guid PlayerId = Guid.Parse("33333333-3333-3333-3333-333333333333");
    public static readonly Guid StrangerId = Guid.Parse("44444444-4444-4444-4444-444444444444");
    public const int BoardSeconds = 240;

    public readonly string Name = Guid.NewGuid().ToString();
    public readonly TestClock Clock = new();
    public AssociationRules Rules { get; set; } = AssociationRules.Default;
    public int QuizId { get; }

    /// <summary>Tile ids by column (0–3 = A–D), in position order.</summary>
    public int[][] Tiles { get; }

    public PlayWorld(QuizStatus status = QuizStatus.Public, QuizFormat format = QuizFormat.Associations, string? shareToken = null)
    {
        using var ctx = Context();
        var quiz = new Quiz
        {
            Title = "Italian cities",
            UserId = AssociationBoardServiceTests.OwnerId,
            Status = status,
            Format = format,
            ShareToken = shareToken,
            TimeLimitInSeconds = BoardSeconds,
            Version = 1,
        };
        ctx.Quizzes.Add(quiz);
        ctx.SaveChanges();
        QuizId = quiz.Id;

        if (format == QuizFormat.Associations)
        {
            var clean = AssociationBoardValidator.ValidateAndClean(AssociationBoardServiceTests.Board(), BoardSeconds, AssociationRules.Default);
            ctx.AssociationBoards.Add(AssociationBoardMapping.ToEntity(clean, quiz.Id, createdInVersion: 1));
            ctx.SaveChanges();
        }

        Tiles = ctx.AssociationTiles.AsNoTracking()
            .Include(t => t.Column)
            .AsEnumerable()
            .GroupBy(t => t.Column.Position)
            .OrderBy(g => g.Key)
            .Select(g => g.OrderBy(t => t.Position).Select(t => t.Id).ToArray())
            .ToArray();
    }

    public ApplicationDbContext Context() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Name)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options,
            new TestCurrentUserService());

    public AssociationPlayService Service(ApplicationDbContext ctx)
    {
        var rules = new Mock<IAssociationRulesProvider>();
        rules.Setup(r => r.GetRulesFor(It.IsAny<int>())).Returns(() => Rules);
        return new AssociationPlayService(
            new AssociationGameRepository(ctx), new AssociationBoardRepository(ctx), rules.Object, Clock);
    }

    /// <summary>Runs one "request" against a fresh context.</summary>
    public async Task<T> Call<T>(Func<AssociationPlayService, Task<T>> call)
    {
        await using var ctx = Context();
        return await call(Service(ctx));
    }

    public QuizSession Session(Guid id)
    {
        using var ctx = Context();
        return ctx.QuizSessions.AsNoTracking().Single(s => s.Id == id);
    }

    public AssociationGame Game(Guid sessionId)
    {
        using var ctx = Context();
        return ctx.AssociationGames.AsNoTracking()
            .Include(g => g.Moves).Include(g => g.Players)
            .Single(g => g.Players.Any(p => p.SessionId == sessionId));
    }
}
