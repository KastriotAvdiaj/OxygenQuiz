using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using QuizAPI.Common;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.Data;
using QuizAPI.Filtering;
using QuizAPI.ManyToManyTables;
using QuizAPI.Mapping;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Media;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Moderation;

/// <summary>
/// A quiz under a moderation hold is refused at every entry point a stranger could use, and the
/// public catalogue splits into picked and community. Like visibility, a hold is enforced at each
/// entry point (ADR 0019) — so each one gets a test. docs/media/moderation.md, "Hiding".
/// </summary>
public class HoldAndPickedEntryPointTests
{
    private static readonly Guid Owner = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid Stranger = Guid.NewGuid();

    private sealed class World
    {
        private readonly string _db = Guid.NewGuid().ToString();
        public int HeldId, PickedId, CommunityId;

        public ApplicationDbContext Context(TestCurrentUserService? caller = null) => new(
            new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(_db)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options,
            caller ?? new TestCurrentUserService());

        public World()
        {
            using var ctx = Context();
            ctx.Users.Add(new User { Id = Owner, Username = "owner", ImmutableName = "owner", Email = "o@t.l", PasswordHash = "x", ProfileImageUrl = "" });
            var cat = new QuestionCategory { Name = "Geo", UserId = Owner };
            var lang = new QuestionLanguage { Language = "English", UserId = Owner };
            var diff = new QuestionDifficulty { Level = "Easy", UserId = Owner };
            ctx.AddRange(cat, lang, diff);
            ctx.SaveChanges();
            Quiz Q(string t) => new()
            {
                Title = t, UserId = Owner, Status = QuizStatus.Public, CategoryId = cat.Id, LanguageId = lang.Id, DifficultyId = diff.ID,
                ShareToken = Guid.NewGuid().ToString("N"),
            };
            var held = Q("Held"); held.ModerationHeldAt = DateTime.UtcNow; held.IsPicked = true;
            var picked = Q("Picked"); picked.IsPicked = true;
            var community = Q("Community");
            ctx.Quizzes.AddRange(held, picked, community);
            ctx.SaveChanges();
            (HeldId, PickedId, CommunityId) = (held.Id, picked.Id, community.Id);
        }

        public QuizService Service(ApplicationDbContext ctx, TestCurrentUserService caller) =>
            new(new QuizRepository(ctx), new Mock<IQuestionRepository>().Object, NullLogger<QuizService>.Instance,
                new Mock<IMediaAttachmentService>().Object, caller);

        public async Task<T> With<T>(TestCurrentUserService caller, Func<QuizService, Task<T>> f)
        {
            await using var ctx = Context(caller);
            return await f(Service(ctx, caller));
        }

        public Task<Quiz> Raw(int id) => Task.FromResult(Context().Quizzes.AsNoTracking().Single(q => q.Id == id));
    }

    private static TestCurrentUserService Guest => new() { UserId = null, IsAuthenticated = false, IsAdmin = false };
    private static TestCurrentUserService StrangerCaller => new() { UserId = Stranger, IsAdmin = false };
    private static TestCurrentUserService OwnerCaller => new() { UserId = Owner, IsAdmin = false };
    private static TestCurrentUserService Admin => new() { IsAdmin = true };

    [Fact]
    public async Task The_catalogue_leaves_a_held_quiz_out()
    {
        var w = new World();
        var page = await w.With(Guest, s => s.SearchQuizzesAsync(new FilterQuery(), publicOnly: true));
        Assert.DoesNotContain(page.Items, q => q.Id == w.HeldId);
        Assert.Contains(page.Items, q => q.Id == w.PickedId);
    }

    [Fact]
    public async Task The_catalogue_splits_into_picked_and_community()
    {
        var w = new World();
        var picked = await w.With(Guest, s => s.SearchQuizzesAsync(new FilterQuery(), publicOnly: true, scope: "picked"));
        var community = await w.With(Guest, s => s.SearchQuizzesAsync(new FilterQuery(), publicOnly: true, scope: "community"));
        var all = await w.With(Guest, s => s.SearchQuizzesAsync(new FilterQuery(), publicOnly: true));

        Assert.Equal(new[] { w.PickedId }, picked.Items.Select(q => q.Id));
        Assert.Equal(new[] { w.CommunityId }, community.Items.Select(q => q.Id));
        Assert.Equal(2, all.Items.Count);
        Assert.True(picked.Items.Single().IsPicked);
    }

    [Fact]
    public async Task The_paged_public_list_honours_the_scope_and_the_hold()
    {
        var w = new World();
        var picked = await w.With(Guest, s => s.GetPublicQuizzesAsync(new QuizFilterParams { Scope = "picked" }));
        Assert.Equal(new[] { w.PickedId }, picked.Items.Select(q => q.Id));
    }

    [Fact]
    public async Task Only_picked_quizzes_go_in_the_sitemap_and_a_held_one_has_no_listing()
    {
        var w = new World();
        var sitemap = await w.With(Guest, s => s.GetQuizListingsAsync());
        Assert.Equal(new[] { w.PickedId }, sitemap.Select(e => e.Id));

        Assert.NotNull(await w.With(Guest, s => s.GetQuizListingAsync(w.CommunityId))); // a page, served noindex
        Assert.Null(await w.With(Guest, s => s.GetQuizListingAsync(w.HeldId)));
    }

    [Fact]
    public async Task A_held_quiz_opens_for_its_owner_and_admins_only()
    {
        var w = new World();
        Assert.Null(await w.With(StrangerCaller, s => s.GetQuizByIdAsync(w.HeldId, Stranger)));
        Assert.Null(await w.With(Guest, s => s.GetQuizByIdAsync(w.HeldId)));

        var own = await w.With(OwnerCaller, s => s.GetQuizByIdAsync(w.HeldId, Owner));
        Assert.True(own!.ModerationHeld); // the owner sees the banner
        Assert.NotNull(await w.With(Admin, s => s.GetQuizByIdAsync(w.HeldId)));
    }

    [Fact]
    public async Task A_share_link_doesnt_open_a_held_quiz()
    {
        var w = new World();
        var token = (await w.Raw(w.HeldId)).ShareToken!;
        Assert.Null(await w.With(Guest, s => s.GetQuizByShareTokenAsync(token)));
    }

    [Fact]
    public async Task Playing_a_held_quiz_is_the_owners_alone_whatever_the_status_or_token()
    {
        var w = new World();
        var held = await w.Raw(w.HeldId);
        Assert.False(QuizPlayAccess.IsPlayAuthorized(held, Stranger, shareToken: null));
        held.Status = QuizStatus.Unlisted;
        Assert.False(QuizPlayAccess.IsPlayAuthorized(held, Stranger, held.ShareToken));
        Assert.True(QuizPlayAccess.IsPlayAuthorized(held, Owner, shareToken: null));

        var picked = await w.Raw(w.PickedId);
        Assert.True(QuizPlayAccess.IsPlayAuthorized(picked, Stranger, shareToken: null));
    }

    [Fact]
    public async Task A_held_quiz_cant_be_hosted_in_a_lobby_by_anyone_but_its_owner()
    {
        var w = new World();
        Assert.False(await w.With(StrangerCaller, s => s.CanHostQuizAsync(w.HeldId, Stranger)));
        Assert.True(await w.With(OwnerCaller, s => s.CanHostQuizAsync(w.HeldId, Owner)));
        Assert.True(await w.With(StrangerCaller, s => s.CanHostQuizAsync(w.PickedId, Stranger)));
    }

    [Fact]
    public void House_quizzes_are_picked_at_creation_community_ones_are_not()
    {
        var house = new Quiz();
        QuizHouse.Stamp(house, creatorIsStaff: true, DateTime.UtcNow);
        Assert.True(house.IsHouse && house.IsPicked);

        var community = new Quiz();
        QuizHouse.Stamp(community, creatorIsStaff: false, DateTime.UtcNow);
        Assert.False(community.IsHouse || community.IsPicked);
    }

    [Fact]
    public void A_hidden_images_url_never_reaches_a_player()
    {
        var qq = new QuizQuestion
        {
            Id = 1,
            Question = new TrueFalseQuestion
            {
                Text = "x", Type = QuestionType.TrueFalse, MediaUrl = "https://media.test/bad.webp",
                MediaType = QuestionMediaType.Image, MediaHiddenAt = DateTime.UtcNow,
            },
        };

        var dto = qq.ToCurrentQuestionDto(Guid.NewGuid());

        Assert.Null(dto.MediaUrl);
        Assert.True(dto.MediaHidden);
        Assert.Equal("Image", dto.MediaType); // the cover knows what's behind it
    }
}
