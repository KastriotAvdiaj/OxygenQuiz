using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using QuizAPI.Controllers.Image.Services;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Models.Associations;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Associations;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Associations;

/// <summary>
/// Authoring Associations quizzes: the create / edit-read / update rules, over the real
/// repositories and an in-memory database. See docs/quiz/associations.md, "Authoring".
///
/// <para>InMemory doesn't enforce the filtered unique index (one live Board per quiz), so the
/// copy-on-write tests assert the rows directly; the ordering of the retire-and-insert against a
/// real Postgres index was checked when this was written (associations.md, "Authoring").</para>
/// </summary>
public class AssociationBoardServiceTests
{
    internal static readonly Guid OwnerId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    internal static readonly Guid StrangerId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private sealed class Db : IDisposable
    {
        public readonly string Name = Guid.NewGuid().ToString();
        public int CategoryId, LanguageId, DifficultyId, UnspecifiedCategoryId;

        public ApplicationDbContext Context() =>
            new(new DbContextOptionsBuilder<ApplicationDbContext>()
                    .UseInMemoryDatabase(Name)
                    .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                    .Options,
                new TestCurrentUserService());

        public Db()
        {
            using var ctx = Context();
            ctx.Users.Add(new User
            {
                Id = OwnerId, Username = "owner", ImmutableName = "owner", Email = "o@example.com",
                PasswordHash = "x", ProfileImageUrl = string.Empty, EmailConfirmed = true,
            });
            var category = new QuestionCategory { Name = "Geography", UserId = OwnerId };
            var unspecified = new QuestionCategory { Name = "Unspecified", UserId = OwnerId };
            var language = new QuestionLanguage { Language = "Albanian", UserId = OwnerId };
            var difficulty = new QuestionDifficulty { Level = "Hard", UserId = OwnerId };
            ctx.AddRange(category, unspecified, language, difficulty);
            ctx.SaveChanges();
            (CategoryId, UnspecifiedCategoryId, LanguageId, DifficultyId) = (category.Id, unspecified.Id, language.Id, difficulty.ID);
        }

        public void Dispose() { }
    }

    private static AssociationBoardService Service(ApplicationDbContext ctx)
    {
        var quizzes = new QuizRepository(ctx);
        var quizService = new QuizService(quizzes, new Mock<IQuestionRepository>().Object,
            NullLogger<QuizService>.Instance, new Mock<IImageService>().Object,
            new TestCurrentUserService { UserId = OwnerId, IsAdmin = true });
        var rules = new Mock<IAssociationRulesProvider>();
        rules.Setup(r => r.GetRulesFor(It.IsAny<int>())).Returns(AssociationRules.Default);
        return new AssociationBoardService(quizzes, new AssociationBoardRepository(ctx), quizService,
            rules.Object, new Mock<IImageService>().Object);
    }

    internal static AssociationBoardInput Board(string suffix = "") => new()
    {
        Columns = new[] { "A", "B", "C", "D" }.Select(letter => new AssociationColumnInput
        {
            Tiles = Enumerable.Range(1, 4).Select(i => $"{letter}{i}{suffix}").ToList(),
            Solution = $"Solution {letter}",
            AcceptableSolutions = new List<string>(),
        }).ToList(),
        FinalSolution = "Final",
        FinalAcceptableSolutions = new List<string> { "The final" },
    };

    private static AssociationQuizCM Cm(Db db, AssociationBoardInput? board = null, string status = "Draft", int seconds = 240) => new()
    {
        Title = "  Oxygen final  ",
        CategoryId = db.CategoryId,
        LanguageId = db.LanguageId,
        DifficultyId = db.DifficultyId,
        Status = status,
        BoardTimeInSeconds = seconds,
        Board = board ?? Board(),
    };

    private static AssociationQuizUM Um(Db db, int id, int version, AssociationBoardInput? board = null, string title = "Oxygen final") => new()
    {
        Id = id,
        Version = version,
        Title = title,
        CategoryId = db.CategoryId,
        LanguageId = db.LanguageId,
        DifficultyId = db.DifficultyId,
        Status = "Draft",
        BoardTimeInSeconds = 240,
        Board = board ?? Board(),
    };

    // ── Create ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_WritesAnAssociationsQuizAndItsWholeBoard()
    {
        using var db = new Db();
        await using (var ctx = db.Context())
        {
            var dto = await Service(ctx).CreateAsync(OwnerId, Cm(db));
            Assert.Equal("Associations", dto.Format);
            Assert.Equal(1, dto.Version);
        }

        await using var check = db.Context();
        var quiz = check.Quizzes.Single();
        Assert.Equal(QuizFormat.Associations, quiz.Format);
        Assert.Equal("Oxygen final", quiz.Title);            // trimmed
        Assert.Equal(240, quiz.TimeLimitInSeconds);          // board time is the quiz's duration
        Assert.Empty(check.QuizQuestions);                   // a board has no questions

        var board = check.AssociationBoards.Include(b => b.Columns).ThenInclude(c => c.Tiles).Single();
        Assert.Equal(1, board.CreatedInVersion);
        Assert.Null(board.RemovedInVersion);
        Assert.Equal(4, board.Columns.Count);
        Assert.All(board.Columns, c => Assert.Equal(4, c.Tiles.Count));
        Assert.Equal(new[] { "B1", "B2", "B3", "B4" },
            board.Columns.Single(c => c.Position == 1).Tiles.OrderBy(t => t.Position).Select(t => t.Text));
        Assert.Equal(new[] { "The final" }, board.FinalAcceptableSolutions);
    }

    [Fact]
    public async Task Create_RefusesToPublishWithAnUnspecifiedLookup_TheClassicGateApplies()
    {
        using var db = new Db();
        await using var ctx = db.Context();
        var cm = Cm(db, status: "Public");
        cm.CategoryId = db.UnspecifiedCategoryId;

        await Assert.ThrowsAsync<AppValidationException>(() => Service(ctx).CreateAsync(OwnerId, cm));
        Assert.Empty(ctx.Quizzes);
    }

    [Theory]
    [InlineData(59)]
    [InlineData(601)]
    public async Task Create_RefusesABoardTimeOutsideTheConfiguredRange(int seconds)
    {
        using var db = new Db();
        await using var ctx = db.Context();
        var ex = await Assert.ThrowsAsync<AppValidationException>(() => Service(ctx).CreateAsync(OwnerId, Cm(db, seconds: seconds)));
        Assert.Contains("Board time", ex.Message);
    }

    [Fact]
    public async Task Create_WritesNothing_WhenTheBoardIsInvalid()
    {
        using var db = new Db();
        await using var ctx = db.Context();
        var board = Board();
        board.Columns[2].Tiles[3] = "  ";

        var ex = await Assert.ThrowsAsync<AppValidationException>(() => Service(ctx).CreateAsync(OwnerId, Cm(db, board)));

        Assert.Contains("Tile C4 is empty", ex.Message);
        Assert.Empty(ctx.Quizzes);
        Assert.Empty(ctx.AssociationBoards);
    }

    // ── Edit read ───────────────────────────────────────────────────────

    private static async Task<int> CreateOne(Db db)
    {
        await using var ctx = db.Context();
        return (await Service(ctx).CreateAsync(OwnerId, Cm(db))).Id;
    }

    [Fact]
    public async Task EditRead_GivesTheOwnerTheWholeBoard_InOrder()
    {
        using var db = new Db();
        var id = await CreateOne(db);
        await using var ctx = db.Context();

        var dto = await Service(ctx).GetForEditAsync(id, OwnerId, isAdmin: false);

        Assert.NotNull(dto);
        Assert.Equal(new[] { "A", "B", "C", "D" }, dto!.Columns.Select(c => c.Letter));
        Assert.Equal(new[] { "D1", "D2", "D3", "D4" }, dto.Columns[3].Tiles.Select(t => t.Text));
        Assert.Equal("Solution D", dto.Columns[3].Solution);
        Assert.Equal(1, dto.Version);
        Assert.Equal(240, dto.BoardTimeInSeconds);
    }

    /// <summary>The edit read is the answer key: a stranger gets nothing — the same as a missing quiz.</summary>
    [Fact]
    public async Task EditRead_IsNothingForAStranger_ButAnAdminMayRead()
    {
        using var db = new Db();
        var id = await CreateOne(db);
        await using var ctx = db.Context();

        Assert.Null(await Service(ctx).GetForEditAsync(id, StrangerId, isAdmin: false));
        Assert.Null(await Service(ctx).GetForEditAsync(id, null, isAdmin: false));
        Assert.NotNull(await Service(ctx).GetForEditAsync(id, StrangerId, isAdmin: true));
    }

    // ── Update ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_WithNewContent_RetiresTheOldBoard_AndAddsANewOneAtTheNewVersion()
    {
        using var db = new Db();
        var id = await CreateOne(db);

        await using (var ctx = db.Context())
        {
            var dto = await Service(ctx).UpdateAsync(OwnerId, Um(db, id, version: 1, board: Board(" v2")));
            Assert.Equal(2, dto!.Version);
        }

        await using var check = db.Context();
        var boards = check.AssociationBoards.Include(b => b.Columns).ThenInclude(c => c.Tiles).OrderBy(b => b.Id).ToList();
        Assert.Equal(2, boards.Count);
        Assert.Equal((1, (int?)2), (boards[0].CreatedInVersion, boards[0].RemovedInVersion));
        Assert.Equal((2, (int?)null), (boards[1].CreatedInVersion, boards[1].RemovedInVersion));
        // The old Board is untouched — a game pinned to version 1 still plays exactly this.
        Assert.Equal("A1", boards[0].Columns.Single(c => c.Position == 0).Tiles.Single(t => t.Position == 0).Text);
        Assert.Equal("A1 v2", boards[1].Columns.Single(c => c.Position == 0).Tiles.Single(t => t.Position == 0).Text);
        Assert.True(boards[0].IsVisibleToVersion(1));
        Assert.False(boards[0].IsVisibleToVersion(2));
        Assert.True(boards[1].IsVisibleToVersion(2));
    }

    [Fact]
    public async Task Update_OfMetadataOnly_BumpsTheVersion_ButKeepsTheSameBoard()
    {
        using var db = new Db();
        var id = await CreateOne(db);

        await using (var ctx = db.Context())
            await Service(ctx).UpdateAsync(OwnerId, Um(db, id, version: 1, title: "Renamed"));

        await using var check = db.Context();
        Assert.Equal(2, check.Quizzes.Single().Version);
        Assert.Equal("Renamed", check.Quizzes.Single().Title);
        var board = check.AssociationBoards.Single();
        Assert.Null(board.RemovedInVersion);
        Assert.Equal(1, board.CreatedInVersion);   // still visible to both versions
    }

    /// <summary>Whitespace the validator trims away isn't a change either.</summary>
    [Fact]
    public async Task Update_WithOnlyTrimmableDifferences_KeepsTheSameBoard()
    {
        using var db = new Db();
        var id = await CreateOne(db);
        var padded = Board();
        padded.Columns[0].Tiles[0] = "  A1  ";

        await using (var ctx = db.Context())
            await Service(ctx).UpdateAsync(OwnerId, Um(db, id, version: 1, board: padded));

        await using var check = db.Context();
        Assert.Single(check.AssociationBoards);
    }

    [Fact]
    public async Task Update_WithAStaleVersion_IsAConflict_AndChangesNothing()
    {
        using var db = new Db();
        var id = await CreateOne(db);
        await using (var ctx = db.Context())
            await Service(ctx).UpdateAsync(OwnerId, Um(db, id, version: 1, title: "First edit"));

        await using (var ctx = db.Context())
            await Assert.ThrowsAsync<ConflictException>(() =>
                Service(ctx).UpdateAsync(OwnerId, Um(db, id, version: 1, title: "Stale edit")));

        await using var check = db.Context();
        Assert.Equal("First edit", check.Quizzes.Single().Title);
    }

    [Fact]
    public async Task Update_ByAStranger_IsNotFound()
    {
        using var db = new Db();
        var id = await CreateOne(db);
        await using var ctx = db.Context();

        Assert.Null(await Service(ctx).UpdateAsync(StrangerId, Um(db, id, version: 1, title: "Hijack")));
    }

    /// <summary>This endpoint only edits boards; a Classic quiz goes through the Classic update.</summary>
    [Fact]
    public async Task Update_OfAClassicQuiz_IsRefused()
    {
        using var db = new Db();
        int id;
        await using (var seed = db.Context())
        {
            var classic = new Quiz { Title = "Capitals", UserId = OwnerId, Format = QuizFormat.Classic, Version = 1 };
            seed.Quizzes.Add(classic);
            seed.SaveChanges();
            id = classic.Id;
        }

        await using var ctx = db.Context();
        await Assert.ThrowsAsync<AppValidationException>(() => Service(ctx).UpdateAsync(OwnerId, Um(db, id, version: 1)));
    }

    // ── The engine can read what was stored ─────────────────────────────

    [Fact]
    public async Task AStoredBoard_MapsToAnEngineKey_WithItsRealTileIds()
    {
        using var db = new Db();
        await CreateOne(db);
        await using var ctx = db.Context();
        var stored = await new AssociationBoardRepository(ctx).GetLiveAsync(ctx.Quizzes.Single().Id);

        var key = AssociationBoardMapping.ToKey(stored!);

        var firstTileOfA = stored!.Columns.Single(c => c.Position == 0).Tiles.Single(t => t.Position == 0).Id;
        Assert.True(key.TryGetColumnOf(firstTileOfA, out var letter));
        Assert.Equal(ColumnLetter.A, letter);
        Assert.True(AssociationGuessMatcher.IsMatch(key.Final, "the final"));
    }
}
