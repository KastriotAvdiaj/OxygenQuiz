using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using QuizAPI.Controllers.Image.Services;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Exceptions;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services;
using QuizAPI.Services.FeaturedQuizzes;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Featured;

/// <summary>
/// Who may take a featured quiz off the quiz home page (docs/quiz/featured-quizzes.md, "Who can
/// change a featured quiz"): deleting or unpublishing is SuperAdmin-only, editing is open to admins,
/// and the read the page uses returns only what is live.
/// </summary>
public class FeaturedQuizRulesTests
{
    private readonly string _dbName = Guid.NewGuid().ToString();
    private static readonly Guid AdminId = Guid.NewGuid();

    private ApplicationDbContext Context() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(_dbName)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options,
            new TestCurrentUserService { IsAdmin = true });

    private async Task<int> SeededIdAsync(string key)
    {
        await using (var ctx = Context())
            await new FeaturedQuizSeeder(ctx, NullLogger<FeaturedQuizSeeder>.Instance).SeedAsync();
        await using var read = Context();
        return (await read.Quizzes.SingleAsync(q => q.FeaturedKey == key)).Id;
    }

    private static QuizService Service(ApplicationDbContext ctx, TestCurrentUserService user) =>
        new(new QuizRepository(ctx), new Mock<IQuestionRepository>().Object,
            NullLogger<QuizService>.Instance, new Mock<IImageService>().Object, user);

    private static TestCurrentUserService Admin => new() { UserId = AdminId, IsAdmin = true };
    private static TestCurrentUserService SuperAdmin => new() { UserId = AdminId, IsAdmin = true, IsSuperAdmin = true };

    [Fact]
    public async Task An_admin_cannot_delete_a_featured_quiz()
    {
        var id = await SeededIdAsync("geography-easy");
        await using var ctx = Context();

        await Assert.ThrowsAsync<ForbiddenException>(() => Service(ctx, Admin).DeleteQuizAsync(AdminId, id, isAdmin: true));
        Assert.True(await ctx.Quizzes.AnyAsync(q => q.Id == id));
    }

    [Fact]
    public async Task A_superadmin_can_delete_a_featured_quiz()
    {
        var id = await SeededIdAsync("geography-easy");
        await using var ctx = Context();

        Assert.True(await Service(ctx, SuperAdmin).DeleteQuizAsync(AdminId, id, isAdmin: true));
    }

    [Fact]
    public async Task An_admin_cannot_unpublish_a_featured_quiz()
    {
        var id = await SeededIdAsync("science-hard");
        await using var ctx = Context();

        await Assert.ThrowsAsync<ForbiddenException>(() => Service(ctx, Admin).SetQuizStatusAsync(AdminId, id, QuizStatus.Draft));
    }

    [Fact]
    public async Task A_superadmin_can_unpublish_a_featured_quiz_they_do_not_own()
    {
        var id = await SeededIdAsync("science-hard");
        await using var ctx = Context();

        var result = await Service(ctx, SuperAdmin).SetQuizStatusAsync(AdminId, id, QuizStatus.Draft);
        Assert.Equal(nameof(QuizStatus.Draft), result!.Status);
    }

    [Fact]
    public async Task An_admin_cannot_unpublish_one_through_the_full_update_either()
    {
        var id = await SeededIdAsync("history-easy");
        await using var ctx = Context();
        var update = new QuizUM { Id = id, Title = "x", Status = nameof(QuizStatus.Draft), Version = 1 };

        await Assert.ThrowsAsync<ForbiddenException>(() => Service(ctx, Admin).UpdateQuizAsync(AdminId, update));
    }

    [Fact]
    public async Task An_admin_gets_past_the_owner_check_to_edit_one()
    {
        var id = await SeededIdAsync("history-easy");
        await using var ctx = Context();
        // A stale version: refused for concurrency — which only happens once ownership has passed.
        var update = new QuizUM { Id = id, Title = "x", Status = nameof(QuizStatus.Public), Version = 99 };

        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => Service(ctx, Admin).UpdateQuizAsync(AdminId, update));
    }

    [Fact]
    public async Task A_player_cannot_edit_one()
    {
        var id = await SeededIdAsync("history-easy");
        await using var ctx = Context();
        var player = new TestCurrentUserService { UserId = Guid.NewGuid(), IsAdmin = false };
        var update = new QuizUM { Id = id, Title = "x", Status = nameof(QuizStatus.Public), Version = 1 };

        Assert.Null(await Service(ctx, player).UpdateQuizAsync(player.UserId!.Value, update));
    }

    [Fact]
    public void Only_a_superadmin_can_delete_an_oxygenquiz_question()
    {
        Assert.Throws<ForbiddenException>(() => FeaturedQuizRules.EnsureCanDeleteQuestion(SystemAccount.Id, isSuperAdmin: false));
        FeaturedQuizRules.EnsureCanDeleteQuestion(SystemAccount.Id, isSuperAdmin: true);
        FeaturedQuizRules.EnsureCanDeleteQuestion(Guid.NewGuid(), isSuperAdmin: false);
    }

    [Fact]
    public async Task The_page_read_returns_only_live_published_featured_quizzes()
    {
        var unpublished = await SeededIdAsync("geography-easy");
        await using (var ctx = Context())
        {
            (await ctx.Quizzes.SingleAsync(q => q.Id == unpublished)).Status = QuizStatus.Draft;
            (await ctx.Quizzes.SingleAsync(q => q.FeaturedKey == "science-easy")).DeletedAt = DateTime.UtcNow;
            ctx.Quizzes.Add(new Quiz { Title = "Not featured", Status = QuizStatus.Public, UserId = AdminId });
            await ctx.SaveChangesAsync();
        }

        await using var read = Context();
        var guest = new TestCurrentUserService { UserId = null, IsAuthenticated = false, IsAdmin = false };
        var featured = await Service(read, guest).GetFeaturedQuizzesAsync();

        Assert.Equal(14, featured.Count);
        Assert.All(featured, q => Assert.NotNull(q.FeaturedKey));
        Assert.DoesNotContain(featured, q => q.FeaturedKey is "geography-easy" or "science-easy");
        Assert.All(featured, q => Assert.Equal(10, q.QuestionCount));
    }
}
