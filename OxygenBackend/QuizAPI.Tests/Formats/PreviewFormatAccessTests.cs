using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using QuizAPI.Common;
using QuizAPI.Controllers.Image.Services;
using QuizAPI.Controllers.Quizzes;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Filtering;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Associations;
using QuizAPI.Services.Audit;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Formats;

/// <summary>
/// A format in preview (Associations, for now) exists for admins only. For anyone else its quizzes
/// are absent from every read, and its authoring endpoints answer 404. See QuizFormatAccess and
/// docs/quiz/associations.md, "Admins only, for now".
///
/// <para>Each read is its own test because each is its own query: the catalogue, search, "my
/// quizzes", by id, by share link and the questions list were written separately, and a format
/// filter missing from one of them is exactly how a preview leaks.</para>
/// </summary>
public class PreviewFormatAccessTests
{
    private static readonly Guid AdminId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid PlayerId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private sealed class World
    {
        public readonly string Db = Guid.NewGuid().ToString();
        public int ClassicId, BoardId;

        public ApplicationDbContext Context() =>
            new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Db).Options,
                new TestCurrentUserService());

        public World()
        {
            using var ctx = Context();
            User U(Guid id, string name) => new()
            {
                Id = id, Username = name, ImmutableName = name, Email = $"{name}@example.com",
                PasswordHash = "x", ProfileImageUrl = string.Empty, EmailConfirmed = true,
            };
            ctx.Users.AddRange(U(AdminId, "admin"), U(PlayerId, "player"));
            var category = new QuestionCategory { Name = "Geography", UserId = AdminId };
            var language = new QuestionLanguage { Language = "English", UserId = AdminId };
            var difficulty = new QuestionDifficulty { Level = "Easy", UserId = AdminId };
            ctx.AddRange(category, language, difficulty);
            ctx.SaveChanges();

            Quiz Q(string title, QuizFormat format, Guid owner) => new()
            {
                Title = title, Format = format, Status = QuizStatus.Public, UserId = owner, Version = 1,
                CategoryId = category.Id, LanguageId = language.Id, DifficultyId = difficulty.ID,
                ShareToken = Guid.NewGuid().ToString("N"),
            };
            var classic = Q("Capitals", QuizFormat.Classic, AdminId);
            var board = Q("Italian cities", QuizFormat.Associations, AdminId);
            ctx.Quizzes.AddRange(classic, board);
            ctx.SaveChanges();
            (ClassicId, BoardId) = (classic.Id, board.Id);
        }

        public QuizService Service(ApplicationDbContext ctx, bool admin) =>
            new(new QuizRepository(ctx), new Mock<IQuestionRepository>().Object,
                NullLogger<QuizService>.Instance, new Mock<IImageService>().Object,
                new TestCurrentUserService { UserId = admin ? AdminId : PlayerId, IsAdmin = admin, IsAuthenticated = true });

        public string TokenOf(int id)
        {
            using var ctx = Context();
            return ctx.Quizzes.Single(q => q.Id == id).ShareToken!;
        }
    }

    [Fact]
    public void AssociationsIsInPreview_ClassicIsNot()
    {
        Assert.False(QuizFormatAccess.IsAvailableTo(QuizFormat.Associations, isAdmin: false));
        Assert.True(QuizFormatAccess.IsAvailableTo(QuizFormat.Associations, isAdmin: true));
        Assert.True(QuizFormatAccess.IsAvailableTo(QuizFormat.Classic, isAdmin: false));
    }

    [Theory]
    [InlineData(false, new[] { "Capitals" })]
    [InlineData(true, new[] { "Capitals", "Italian cities" })]
    public async Task TheCatalogue_HidesTheBoardFromPlayers(bool admin, string[] expected)
    {
        var world = new World();
        await using var ctx = world.Context();

        var page = await world.Service(ctx, admin).GetPublicQuizzesAsync(new QuizFilterParams());

        Assert.Equal(expected.OrderBy(t => t), page.Items.Select(q => q.Title).OrderBy(t => t));
    }

    [Theory]
    [InlineData(false, 1)]
    [InlineData(true, 2)]
    public async Task Search_HidesTheBoardFromPlayers(bool admin, int expected)
    {
        var world = new World();
        await using var ctx = world.Context();

        var result = await world.Service(ctx, admin).SearchQuizzesAsync(new FilterQuery(), publicOnly: true);

        Assert.Equal(expected, result.Items.Count());
    }

    /// <summary>The catalogue's Format filter ("Quizzes" / "Boards"), and that it can't reach past the preview gate.</summary>
    [Theory]
    [InlineData(true, "Associations", new[] { "Italian cities" })]
    [InlineData(true, "Classic", new[] { "Capitals" })]
    [InlineData(false, "Associations", new string[0])]
    public async Task Search_FiltersByFormat_WithinWhatTheCallerMaySee(bool admin, string format, string[] expected)
    {
        var world = new World();
        await using var ctx = world.Context();

        var query = new FilterQuery { Filter = { $"format:eq:{format}" } };
        var result = await world.Service(ctx, admin).SearchQuizzesAsync(query, publicOnly: true);

        Assert.Equal(expected, result.Items.Select(q => q.Title).ToArray());
    }

    [Fact]
    public async Task ByIdAndItsQuestions_AreNothingForAPlayer_ButClassicStillLoads()
    {
        var world = new World();
        await using var ctx = world.Context();
        var sut = world.Service(ctx, admin: false);

        Assert.Null(await sut.GetQuizByIdAsync(world.BoardId, PlayerId));
        Assert.Null(await sut.GetQuizQuestionsAsync(world.BoardId));
        Assert.NotNull(await sut.GetQuizByIdAsync(world.ClassicId, PlayerId));
        Assert.NotNull(await sut.GetQuizQuestionsAsync(world.ClassicId));
    }

    [Fact]
    public async Task ByIdForAnAdmin_LoadsTheBoard()
    {
        var world = new World();
        await using var ctx = world.Context();

        var dto = await world.Service(ctx, admin: true).GetQuizByIdAsync(world.BoardId, AdminId);

        Assert.Equal("Associations", dto!.Format);
    }

    [Fact]
    public async Task AShareLink_DoesNotOpenABoardForAPlayer()
    {
        var world = new World();
        await using var ctx = world.Context();

        Assert.Null(await world.Service(ctx, admin: false).GetQuizByShareTokenAsync(world.TokenOf(world.BoardId)));
        Assert.NotNull(await world.Service(ctx, admin: true).GetQuizByShareTokenAsync(world.TokenOf(world.BoardId)));
    }

    // ── The authoring endpoints ─────────────────────────────────────────

    private static (AssociationQuizzesController Controller, Mock<IAssociationBoardService> Service) Controller(bool admin)
    {
        var service = new Mock<IAssociationBoardService>(MockBehavior.Strict);
        var controller = new AssociationQuizzesController(
            service.Object,
            new TestCurrentUserService { UserId = admin ? AdminId : PlayerId, IsAdmin = admin, IsAuthenticated = true },
            new Mock<IAuditService>().Object);
        return (controller, service);
    }

    /// <summary>Strict mock: a player's request must be turned away before the service is touched.</summary>
    [Fact]
    public async Task EveryAuthoringEndpoint_IsNotFoundForAPlayer()
    {
        var (controller, _) = Controller(admin: false);

        Assert.IsType<NotFoundResult>(await controller.Create(new AssociationQuizCM()));
        Assert.IsType<NotFoundResult>(await controller.GetBoard(1));
        Assert.IsType<NotFoundResult>(await controller.Update(new AssociationQuizUM()));
    }

    [Fact]
    public async Task AnAdmin_ReachesTheService()
    {
        var (controller, service) = Controller(admin: true);
        service.Setup(s => s.GetForEditAsync(1, AdminId, true)).ReturnsAsync((AssociationBoardDTO?)null);

        Assert.IsType<NotFoundResult>(await controller.GetBoard(1));   // no such board — but asked
        service.Verify(s => s.GetForEditAsync(1, AdminId, true), Times.Once);
    }

    // ── The play endpoints ──────────────────────────────────────────────

    /// <summary>
    /// Strict mock, as above: Solo play is as absent for a player as authoring is. The one read a
    /// player gets is the review of a Duel they played — an admin can invite anyone to a Duel
    /// (associations.md §10.1), and that player has seen the whole Board already. The service
    /// decides that (<c>GetOwnDuelAsync</c>, DuelReviewTests); nothing else reaches it.
    /// </summary>
    [Fact]
    public async Task EveryPlayEndpoint_IsNotFoundForAPlayer_ExceptTheReviewOfTheirOwnDuel()
    {
        var play = new Mock<IAssociationPlayService>(MockBehavior.Strict);
        var id = Guid.NewGuid();
        var duel = new AssociationGameViewDTO { SessionId = id, PlayStyle = "Duel" };
        play.Setup(p => p.GetOwnDuelAsync(id, PlayerId)).ReturnsAsync(duel);
        var controller = new AssociationSessionsController(
            play.Object,
            new TestCurrentUserService { UserId = PlayerId, IsAdmin = false, IsAuthenticated = true });

        Assert.IsType<NotFoundResult>(await controller.Start(new StartAssociationGameRequest { QuizId = 1 }));
        Assert.Same(duel, Assert.IsType<OkObjectResult>(await controller.Get(id)).Value);
        Assert.IsType<NotFoundResult>(await controller.Open(id, new OpenAssociationTileRequest { TileId = 1 }));
        Assert.IsType<NotFoundResult>(await controller.Guess(id, new AssociationGuessRequest { Target = "A", Text = "x" }));
        Assert.IsType<NotFoundResult>(await controller.GiveUp(id));
        Assert.IsType<NotFoundResult>(await controller.Restart(id, null));
    }
}
