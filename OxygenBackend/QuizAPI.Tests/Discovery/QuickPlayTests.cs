using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using QuizAPI.Controllers.Quizzes;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Discovery;

/// <summary>
/// Quick play's two anonymous endpoints over the real service and repository: which
/// (category, difficulty) pairs have a quiz to hand out, and one quiz for a choice.
/// docs/quiz/quick-play.md.
/// </summary>
public class QuickPlayTests
{
    private static readonly Guid PlayerId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private sealed class World
    {
        public readonly string Db = Guid.NewGuid().ToString();
        public int Geography, History, Easy, Hard, English, Albanian;
        public readonly Dictionary<string, int> Quiz = new();

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
                Id = PlayerId, Username = "player", ImmutableName = "player", Email = "player@example.com",
                PasswordHash = "x", ProfileImageUrl = string.Empty, EmailConfirmed = true,
            });
            var geography = new QuestionCategory { Name = "Geography", UserId = PlayerId };
            var history = new QuestionCategory { Name = "History", UserId = PlayerId };
            var english = new QuestionLanguage { Language = "English", UserId = PlayerId };
            var albanian = new QuestionLanguage { Language = "Albanian", UserId = PlayerId };
            var easy = new QuestionDifficulty { Level = "Easy", UserId = PlayerId };
            var hard = new QuestionDifficulty { Level = "Hard", UserId = PlayerId };
            ctx.AddRange(geography, history, english, albanian, easy, hard);
            ctx.SaveChanges();
            (Geography, History, Easy, Hard, English, Albanian) =
                (geography.Id, history.Id, easy.ID, hard.ID, english.Id, albanian.Id);

            Quiz Q(string title, int category, int difficulty, int? language = null, bool picked = true,
                QuizStatus status = QuizStatus.Public, QuizFormat format = QuizFormat.Classic) => new()
            {
                Title = title, Status = status, Format = format, IsPicked = picked, UserId = PlayerId,
                CategoryId = category, DifficultyId = difficulty, LanguageId = language ?? english.Id,
                ShareToken = Guid.NewGuid().ToString("N"),
            };

            var held = Q("held", Geography, Easy);
            held.ModerationHeldAt = DateTime.UtcNow;
            var deleted = Q("deleted", Geography, Easy);
            deleted.DeletedAt = DateTime.UtcNow;
            var quizzes = new[]
            {
                Q("geo-easy-1", Geography, Easy), Q("geo-easy-2", Geography, Easy), Q("geo-hard", Geography, Hard),
                Q("history-albanian", History, Easy, albanian.Id),
                // None of these may ever be handed out.
                Q("community", Geography, Easy, picked: false),
                Q("draft", Geography, Easy, status: QuizStatus.Draft),
                Q("unlisted", Geography, Easy, status: QuizStatus.Unlisted),
                Q("board", Geography, Easy, format: QuizFormat.Associations),
                held, deleted,
            };
            ctx.Quizzes.AddRange(quizzes);
            ctx.SaveChanges();
            foreach (var quiz in quizzes) Quiz[quiz.Title] = quiz.Id;
        }

        public QuickPlayController Controller(ApplicationDbContext ctx, TestCurrentUserService caller, int seed = 1) =>
            new(new QuickPlayService(new QuizRepository(ctx), new Random(seed)), caller)
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
            };

        public void Played(string title)
        {
            using var ctx = Context();
            ctx.QuizSessions.Add(new QuizSession { Id = Guid.NewGuid(), QuizId = Quiz[title], UserId = PlayerId, StartTime = DateTime.UtcNow });
            ctx.SaveChanges();
        }
    }

    private static TestCurrentUserService Guest => new() { UserId = null, IsAuthenticated = false, IsAdmin = false };
    private static TestCurrentUserService Player => new() { UserId = PlayerId, IsAdmin = false };
    private static TestCurrentUserService Admin => new() { IsAdmin = true };

    private static QuickPlayPickDTO Picked(IActionResult result) =>
        Assert.IsType<QuickPlayPickDTO>(Assert.IsType<OkObjectResult>(result).Value);

    private static async Task<HashSet<int?>> Draws(World w, TestCurrentUserService caller, int? category, int? difficulty,
        string? languages = null)
    {
        var drawn = new HashSet<int?>();
        for (var seed = 0; seed < 40; seed++)
        {
            using var ctx = w.Context();
            drawn.Add(Picked(await w.Controller(ctx, caller, seed).Pick(category, difficulty, languages, null, false, default)).QuizId);
        }
        return drawn;
    }

    [Fact]
    public async Task Options_count_only_quizzes_that_can_be_handed_out()
    {
        var w = new World();
        using var ctx = w.Context();

        var ok = Assert.IsType<OkObjectResult>(await w.Controller(ctx, Guest).Options(null, default));
        var combos = Assert.IsType<List<QuickPlayComboDTO>>(ok.Value);

        // Community, Draft, Unlisted, held, deleted and the board are all Geography/Easy — and not counted.
        Assert.Equal(3, combos.Count);
        Assert.Contains(new QuickPlayComboDTO(w.Geography, w.Easy, 2), combos);
        Assert.Contains(new QuickPlayComboDTO(w.Geography, w.Hard, 1), combos);
        Assert.Contains(new QuickPlayComboDTO(w.History, w.Easy, 1), combos);
    }

    [Fact]
    public async Task Options_can_be_narrowed_to_languages()
    {
        var w = new World();
        using var ctx = w.Context();

        var ok = Assert.IsType<OkObjectResult>(await w.Controller(ctx, Guest).Options($"{w.English}", default));

        Assert.DoesNotContain(Assert.IsType<List<QuickPlayComboDTO>>(ok.Value), c => c.CategoryId == w.History);
    }

    [Theory]
    [InlineData("guest")]
    [InlineData("admin")]
    public async Task A_pick_is_one_of_the_matching_picked_public_classic_quizzes_whoever_asks(string who)
    {
        var w = new World();

        var drawn = await Draws(w, who == "admin" ? Admin : Guest, w.Geography, w.Easy);

        // Both come up over many draws, and nothing else ever does — for an admin too.
        Assert.Equal(new HashSet<int?> { w.Quiz["geo-easy-1"], w.Quiz["geo-easy-2"] }, drawn);
    }

    [Fact]
    public async Task With_no_category_or_difficulty_any_quiz_may_come()
    {
        var w = new World();

        var drawn = await Draws(w, Guest, null, null);

        Assert.Equal(
            new HashSet<int?> { w.Quiz["geo-easy-1"], w.Quiz["geo-easy-2"], w.Quiz["geo-hard"], w.Quiz["history-albanian"] },
            drawn);
    }

    [Fact]
    public async Task Nothing_matching_is_a_404()
    {
        var w = new World();
        using var ctx = w.Context();

        Assert.IsType<NotFoundResult>(await w.Controller(ctx, Guest).Pick(w.History, w.Hard, null, null, false, default));
        // History has a quiz, but not in English.
        Assert.IsType<NotFoundResult>(await w.Controller(ctx, Guest).Pick(w.History, null, $"{w.English}", null, false, default));
    }

    [Fact]
    public async Task What_the_client_has_seen_is_not_handed_out_again()
    {
        var w = new World();
        using var ctx = w.Context();
        var controller = w.Controller(ctx, Guest);

        var second = Picked(await controller.Pick(w.Geography, w.Easy, null, $"{w.Quiz["geo-easy-1"]}", false, default));
        var none = Picked(await controller.Pick(w.Geography, w.Easy, null,
            $"{w.Quiz["geo-easy-1"]},{w.Quiz["geo-easy-2"]}", false, default));

        Assert.Equal(w.Quiz["geo-easy-2"], second.QuizId);
        // Told, not silently repeated.
        Assert.Null(none.QuizId);
        Assert.True(none.Exhausted);
    }

    [Fact]
    public async Task A_signed_in_player_is_not_handed_a_quiz_they_have_a_session_of()
    {
        var w = new World();
        w.Played("geo-easy-1");

        Assert.Equal(new HashSet<int?> { w.Quiz["geo-easy-2"] }, await Draws(w, Player, w.Geography, w.Easy));

        w.Played("geo-easy-2");
        using var ctx = w.Context();
        Assert.True(Picked(await w.Controller(ctx, Player).Pick(w.Geography, w.Easy, null, null, false, default)).Exhausted);
        // Someone else's sessions are theirs.
        Assert.False(Picked(await w.Controller(ctx, Guest).Pick(w.Geography, w.Easy, null, null, false, default)).Exhausted);
    }

    [Fact]
    public async Task Asking_for_a_repeat_gives_one_and_not_the_quiz_just_played_when_there_is_another()
    {
        var w = new World();
        w.Played("geo-easy-1");
        w.Played("geo-easy-2");
        w.Played("geo-hard");

        for (var seed = 0; seed < 20; seed++)
        {
            using var ctx = w.Context();
            var controller = w.Controller(ctx, Player, seed);
            Assert.Equal(w.Quiz["geo-easy-1"],
                Picked(await controller.Pick(w.Geography, w.Easy, null, $"{w.Quiz["geo-easy-2"]}", true, default)).QuizId);
            // The only one there is: it comes again.
            Assert.Equal(w.Quiz["geo-hard"],
                Picked(await controller.Pick(w.Geography, w.Hard, null, $"{w.Quiz["geo-hard"]}", true, default)).QuizId);
        }
    }

    [Fact]
    public void A_list_of_ids_drops_what_is_not_one_and_is_capped()
    {
        Assert.Equal(new List<int> { 3, 7 }, QuickPlayController.Ids(" 3, x, -1, 7,3,,0"));
        Assert.Empty(QuickPlayController.Ids(null));
        Assert.Equal(QuickPlayController.MaxExcluded,
            QuickPlayController.Ids(string.Join(',', Enumerable.Range(1, 500))).Count);
    }
}
