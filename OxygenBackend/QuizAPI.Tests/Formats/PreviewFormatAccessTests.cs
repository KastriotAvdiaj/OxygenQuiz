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
/// Associations was in preview — visible to admins and Teachers only — until its release on
/// 2026-10-08. These pin the release: a player gets boards from every read and reaches the
/// authoring and play services. The preview mechanism (QuizFormatAccess.PreviewFormats) is still
/// there, empty, for the next format; see docs/quiz/associations.md §0.
///
/// <para>Each read is its own test because each is its own query: the catalogue, search, by id
/// and by share link were written separately, and a format filter left behind in one of them is
/// exactly how a release would half-happen.</para>
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

        /// <summary>A Teacher: not an admin, but may see formats in preview (docs/auth/teacher-role.md §2.3).</summary>
        public QuizService TeacherService(ApplicationDbContext ctx) =>
            new(new QuizRepository(ctx), new Mock<IQuestionRepository>().Object,
                NullLogger<QuizService>.Instance, new Mock<IImageService>().Object,
                new TestCurrentUserService { UserId = PlayerId, IsAdmin = false, IsTeacher = true, IsAuthenticated = true });

        public string TokenOf(int id)
        {
            using var ctx = Context();
            return ctx.Quizzes.Single(q => q.Id == id).ShareToken!;
        }
    }

    [Fact]
    public void NoFormatIsInPreview()
    {
        Assert.Empty(QuizFormatAccess.PreviewFormats);
        Assert.True(QuizFormatAccess.IsAvailableTo(QuizFormat.Associations, canSeePreview: false));
        Assert.True(QuizFormatAccess.IsAvailableTo(QuizFormat.Classic, canSeePreview: false));
    }

    [Fact]
    public async Task ATeacher_SeesTheBoard_InTheCatalogue_SearchAndById()
    {
        var world = new World();
        await using var ctx = world.Context();
        var service = world.TeacherService(ctx);

        var page = await service.GetPublicQuizzesAsync(new QuizFilterParams());
        var search = await service.SearchQuizzesAsync(new FilterQuery(), publicOnly: true);
        var byId = await service.GetQuizByIdAsync(world.BoardId, PlayerId);

        Assert.Contains("Italian cities", page.Items.Select(q => q.Title));
        Assert.Equal(2, search.Items.Count());
        Assert.NotNull(byId);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task TheCatalogue_ShowsTheBoardToEveryone(bool admin)
    {
        var world = new World();
        await using var ctx = world.Context();

        var page = await world.Service(ctx, admin).GetPublicQuizzesAsync(new QuizFilterParams());

        Assert.Equal(new[] { "Capitals", "Italian cities" }, page.Items.Select(q => q.Title).OrderBy(t => t));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Search_ShowsTheBoardToEveryone(bool admin)
    {
        var world = new World();
        await using var ctx = world.Context();

        var result = await world.Service(ctx, admin).SearchQuizzesAsync(new FilterQuery(), publicOnly: true);

        Assert.Equal(2, result.Items.Count());
    }

    /// <summary>The catalogue's Format filter ("Quizzes" / "Boards") — now for a player too.</summary>
    [Theory]
    [InlineData(false, "Associations", new[] { "Italian cities" })]
    [InlineData(false, "Classic", new[] { "Capitals" })]
    [InlineData(true, "Associations", new[] { "Italian cities" })]
    public async Task Search_FiltersByFormat(bool admin, string format, string[] expected)
    {
        var world = new World();
        await using var ctx = world.Context();

        var query = new FilterQuery { Filter = { $"format:eq:{format}" } };
        var result = await world.Service(ctx, admin).SearchQuizzesAsync(query, publicOnly: true);

        Assert.Equal(expected, result.Items.Select(q => q.Title).ToArray());
    }

    [Fact]
    public async Task ById_LoadsTheBoardForAPlayer()
    {
        var world = new World();
        await using var ctx = world.Context();

        var dto = await world.Service(ctx, admin: false).GetQuizByIdAsync(world.BoardId, PlayerId);

        Assert.Equal("Associations", dto!.Format);
    }

    [Fact]
    public async Task AShareLink_OpensABoardForAPlayer()
    {
        var world = new World();
        await using var ctx = world.Context();

        Assert.NotNull(await world.Service(ctx, admin: false).GetQuizByShareTokenAsync(world.TokenOf(world.BoardId)));
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

    /// <summary>Strict mock: the call must arrive — a player is no longer turned away before it.</summary>
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task EveryoneReachesTheAuthoringService(bool admin)
    {
        var (controller, service) = Controller(admin);
        var caller = admin ? AdminId : PlayerId;
        service.Setup(s => s.GetForEditAsync(1, caller, admin)).ReturnsAsync((AssociationBoardDTO?)null);

        Assert.IsType<NotFoundResult>(await controller.GetBoard(1));   // no such board — but asked
        service.Verify(s => s.GetForEditAsync(1, caller, admin), Times.Once);
    }

    // ── The play endpoints ──────────────────────────────────────────────

    /// <summary>Strict mock, as above: a player's Solo game reaches the play service.</summary>
    [Fact]
    public async Task APlayer_ReachesThePlayService()
    {
        var play = new Mock<IAssociationPlayService>(MockBehavior.Strict);
        var id = Guid.NewGuid();
        var view = new AssociationGameViewDTO { SessionId = id, PlayStyle = "Solo" };
        play.Setup(p => p.StartAsync(PlayerId, 1, null)).ReturnsAsync(view);
        play.Setup(p => p.GetAsync(id, PlayerId, false)).ReturnsAsync(view);
        var controller = new AssociationSessionsController(
            play.Object,
            new TestCurrentUserService { UserId = PlayerId, IsAdmin = false, IsAuthenticated = true });

        Assert.Same(view, Assert.IsType<CreatedResult>(await controller.Start(new StartAssociationGameRequest { QuizId = 1 })).Value);
        Assert.Same(view, Assert.IsType<OkObjectResult>(await controller.Get(id)).Value);
    }
}
