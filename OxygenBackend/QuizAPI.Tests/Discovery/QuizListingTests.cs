using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using QuizAPI.Services.Media;
using QuizAPI.Controllers.Quizzes;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Discovery;

/// <summary>
/// The quiz listing's two anonymous endpoints — <c>GET /api/quiz/{id}/listing</c> and
/// <c>GET /api/quiz/listings</c> — over the real service and repository. A quiz has a listing
/// exactly when the catalogue would show it to a guest: Public and a released format. Everything
/// else is one indistinguishable 404, whoever asks. docs/quiz/quiz-listing.md, "Which quizzes have one".
/// </summary>
public class QuizListingTests
{
    private static readonly Guid OwnerId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private sealed class World
    {
        public readonly string Db = Guid.NewGuid().ToString();
        public int PublicId, DraftId, UnlistedId, DeletedId, BoardId;
        public static readonly DateTime Created = new(2026, 9, 1, 12, 0, 0, DateTimeKind.Utc);
        public static readonly DateTime Edited = new(2026, 10, 2, 8, 30, 0, DateTimeKind.Utc);

        public ApplicationDbContext Context() =>
            new(new DbContextOptionsBuilder<ApplicationDbContext>()
                    .UseInMemoryDatabase(Db)
                    .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                    .Options,
                new TestCurrentUserService());

        public World()
        {
            using var ctx = Context();
            ctx.Users.Add(new User
            {
                Id = OwnerId, Username = "kastriot", ImmutableName = "kastriot", Email = "owner@example.com",
                PasswordHash = "x", ProfileImageUrl = string.Empty, EmailConfirmed = true,
            });
            var category = new QuestionCategory
            {
                Name = "Geography", UserId = OwnerId, ColorPaletteJson = "[\"#123456\",\"#abcdef\"]",
            };
            var language = new QuestionLanguage { Language = "Albanian", UserId = OwnerId };
            var difficulty = new QuestionDifficulty { Level = "Hard", UserId = OwnerId };
            ctx.AddRange(category, language, difficulty);
            ctx.SaveChanges();

            Quiz Q(string title, QuizStatus status, QuizFormat format = QuizFormat.Classic) => new()
            {
                Title = title, Description = "Capitals of the Balkans", Status = status, Format = format,
                UserId = OwnerId, Version = 3, TimeLimitInSeconds = 490, ImageUrl = "/uploads/q.png",
                CategoryId = category.Id, LanguageId = language.Id, DifficultyId = difficulty.ID,
                ShareToken = Guid.NewGuid().ToString("N"), CreatedAt = Created, UpdatedAt = Edited,
            };
            var pub = Q("Kërrë gjeneral për makina", QuizStatus.Public);
            // Picked: since 2026-10-24 only picked quizzes are in the sitemap (a community quiz still
            // has a listing page, served noindex). HoldAndPickedEntryPointTests covers the split.
            pub.IsPicked = true;
            var draft = Q("Draft", QuizStatus.Draft);
            var unlisted = Q("Unlisted", QuizStatus.Unlisted);
            var deleted = Q("Deleted", QuizStatus.Public);
            deleted.DeletedAt = Edited;
            var board = Q("Board", QuizStatus.Public, QuizFormat.Associations);
            ctx.Quizzes.AddRange(pub, draft, unlisted, deleted, board);
            ctx.SaveChanges();
            (PublicId, DraftId, UnlistedId, DeletedId, BoardId) = (pub.Id, draft.Id, unlisted.Id, deleted.Id, board.Id);
        }

        public QuizController Controller(ApplicationDbContext ctx, TestCurrentUserService caller)
        {
            var service = new QuizService(new QuizRepository(ctx), new Mock<IQuestionRepository>().Object,
                NullLogger<QuizService>.Instance, new Mock<IMediaAttachmentService>().Object, caller);
            return new QuizController(service, NullLogger<QuizController>.Instance, caller, Mock.Of<IAuditService>(),
                Mock.Of<QuizAPI.Services.Permissions.IPermissionService>())
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
            };
        }
    }

    private static TestCurrentUserService Guest => new() { UserId = null, IsAuthenticated = false, IsAdmin = false };
    private static TestCurrentUserService Owner => new() { UserId = OwnerId, IsAdmin = false };
    private static TestCurrentUserService Admin => new() { IsAdmin = true };
    private static TestCurrentUserService Teacher => new() { IsAdmin = false, IsTeacher = true };

    public static IEnumerable<object[]> Callers() => new[]
    {
        new object[] { "guest" }, new object[] { "owner" }, new object[] { "admin" }, new object[] { "teacher" },
    };

    private static TestCurrentUserService Caller(string name) => name switch
    {
        "guest" => Guest, "owner" => Owner, "admin" => Admin, _ => Teacher,
    };

    // ── GET /api/quiz/{id}/listing ──────────────────────────────────────────

    [Fact]
    public async Task A_guest_gets_a_public_quiz_listing_with_the_shown_facts()
    {
        var w = new World();
        using var ctx = w.Context();
        var controller = w.Controller(ctx, Guest);

        var ok = Assert.IsType<OkObjectResult>(await controller.GetQuizListing(w.PublicId));
        var dto = Assert.IsType<QuizListingDTO>(ok.Value);

        Assert.Equal(w.PublicId, dto.Id);
        Assert.Equal("Kërrë gjeneral për makina", dto.Title);
        Assert.Equal("Capitals of the Balkans", dto.Description);
        Assert.Equal("Geography", dto.Category);
        Assert.Equal("[\"#123456\",\"#abcdef\"]", dto.ColorPaletteJson);
        Assert.Equal("Hard", dto.Difficulty);
        Assert.Equal("Albanian", dto.Language);
        Assert.Equal(490, dto.TimeLimitInSeconds);
        Assert.Equal("kastriot", dto.Author);
        Assert.Equal("/uploads/q.png", dto.ImageUrl);
        Assert.Equal("Classic", dto.Format);
        Assert.Equal(World.Created, dto.CreatedAt);
        Assert.Equal(World.Edited, dto.UpdatedAt);
        Assert.Equal("public, max-age=300", controller.Response.Headers.CacheControl.ToString());
    }

    [Theory]
    [MemberData(nameof(Callers))]
    public async Task Every_ineligible_quiz_is_the_same_404_as_a_missing_id_whoever_asks(string caller)
    {
        // Ids are sequential: a 404 that differed by cause would map which ids are Unlisted. And the
        // page is one cached document for everyone, so an admin or a Teacher (who may see a preview
        // format elsewhere) gets the guest's answer here.
        var w = new World();
        using var ctx = w.Context();
        var controller = w.Controller(ctx, Caller(caller));

        foreach (var id in new[] { w.DraftId, w.UnlistedId, w.DeletedId, w.BoardId, 9999 })
        {
            var result = await controller.GetQuizListing(id);
            Assert.IsType<NotFoundResult>(result);
        }
    }

    [Fact]
    public void The_listing_DTO_cannot_carry_what_the_page_must_never_show()
    {
        // No field, no leak: a later change to the page can't expose these by accident.
        var names = typeof(QuizListingDTO).GetProperties().Select(p => p.Name).ToHashSet();
        foreach (var forbidden in new[] { "Status", "ShareToken", "UserId", "User", "Email", "Questions", "Version", "DeletedAt" })
            Assert.DoesNotContain(forbidden, names);
    }

    // ── GET /api/quiz/listings ──────────────────────────────────────────────

    [Theory]
    [MemberData(nameof(Callers))]
    public async Task The_sitemap_source_lists_exactly_the_eligible_quizzes(string caller)
    {
        var w = new World();
        using var ctx = w.Context();
        var controller = w.Controller(ctx, Caller(caller));

        var ok = Assert.IsType<OkObjectResult>(await controller.GetQuizListings());
        var rows = Assert.IsAssignableFrom<IEnumerable<QuizListingEntryDTO>>(ok.Value).ToList();

        var only = Assert.Single(rows);
        Assert.Equal(w.PublicId, only.Id);
        Assert.Equal("Kërrë gjeneral për makina", only.Title);
        Assert.Equal(World.Edited, only.UpdatedAt);
        Assert.Equal("public, max-age=300", controller.Response.Headers.CacheControl.ToString());
    }
}
