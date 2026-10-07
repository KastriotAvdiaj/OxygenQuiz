using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Services;
using QuizAPI.Services.FeaturedQuizzes;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Featured;

/// <summary>
/// The featured-quiz seeder against the real shipped content: what a fresh database gets, and that
/// it never overwrites or resurrects anything on one that already has it
/// (docs/quiz/featured-quizzes.md; ADR 0026).
/// </summary>
public class FeaturedQuizSeederTests
{
    private readonly string _dbName = Guid.NewGuid().ToString();

    private ApplicationDbContext Context() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(_dbName)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options,
            new TestCurrentUserService { UserId = null, IsAdmin = false });

    private async Task SeedAsync()
    {
        await using var ctx = Context();
        await new FeaturedQuizSeeder(ctx, NullLogger<FeaturedQuizSeeder>.Instance).SeedAsync();
    }

    [Fact]
    public async Task A_fresh_database_gets_all_sixteen_quizzes_of_ten_questions()
    {
        await SeedAsync();

        await using var ctx = Context();
        var quizzes = await ctx.Quizzes.Include(q => q.QuizQuestions).Where(q => q.FeaturedKey != null).ToListAsync();
        Assert.Equal(16, quizzes.Count);
        Assert.All(quizzes, q =>
        {
            Assert.Equal(10, q.QuizQuestions.Count);
            Assert.Equal(QuizStatus.Public, q.Status);
            Assert.Equal(SystemAccount.Id, q.UserId);
            Assert.True(q.ShowFeedbackImmediately);
            Assert.Equal(q.QuizQuestions.Sum(qq => qq.TimeLimitInSeconds), q.TimeLimitInSeconds);
        });
    }

    [Fact]
    public async Task Its_questions_are_global_owned_by_oxygenquiz_and_explained()
    {
        await SeedAsync();

        await using var ctx = Context();
        var questions = await ctx.Questions.IgnoreQueryFilters().ToListAsync();
        Assert.Equal(160, questions.Count);
        Assert.All(questions, q =>
        {
            Assert.Equal(QuestionVisibility.Global, q.Visibility);
            Assert.Equal(SystemAccount.Id, q.UserId);
            Assert.False(string.IsNullOrWhiteSpace(q.Explanation));
        });
        var multipleChoice = await ctx.Set<MultipleChoiceQuestion>().IgnoreQueryFilters().Include(q => q.AnswerOptions).ToListAsync();
        Assert.All(multipleChoice, q =>
        {
            Assert.Equal(4, q.AnswerOptions.Count);
            Assert.Single(q.AnswerOptions, o => o.IsCorrect);
        });
    }

    [Fact]
    public async Task A_fresh_database_gets_the_baseline_lookups_and_the_new_palettes()
    {
        await SeedAsync();

        await using var ctx = Context();
        var categories = await ctx.QuestionCategories.ToDictionaryAsync(c => c.Name);
        Assert.Equal(new[] { "General Knowledge", "Geography", "History", "Science", "Unspecified" }, categories.Keys.OrderBy(k => k));
        Assert.Equal(new[] { "#0B5CA8", "#CFE3F5" }, JsonSerializer.Deserialize<string[]>(categories["Geography"].ColorPaletteJson!));
        Assert.Equal(new[] { "English", "Unspecified" }, (await ctx.QuestionLanguages.Select(l => l.Language).ToListAsync()).OrderBy(l => l));
        Assert.Equal(new[] { "Easy", "Expert", "Hard", "Medium", "Unspecified" }, (await ctx.QuestionDifficulties.Select(d => d.Level).ToListAsync()).OrderBy(l => l));
    }

    [Fact]
    public async Task The_owner_is_a_protected_account()
    {
        await SeedAsync();

        await using var ctx = Context();
        var owner = await ctx.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == SystemAccount.Id);
        Assert.True(owner.IsProtected);
        Assert.Equal(SystemAccount.Username, owner.Username);
    }

    [Fact]
    public async Task Running_twice_creates_nothing_new()
    {
        await SeedAsync();
        await SeedAsync();

        await using var ctx = Context();
        Assert.Equal(16, await ctx.Quizzes.CountAsync());
        Assert.Equal(160, await ctx.Questions.IgnoreQueryFilters().CountAsync());
        Assert.Equal(5, await ctx.QuestionCategories.CountAsync());
    }

    [Fact]
    public async Task An_existing_category_keeps_its_own_palette_and_spelling()
    {
        await using (var ctx = Context())
        {
            ctx.Users.Add(new User { Id = Guid.NewGuid(), Username = "admin", ImmutableName = "admin", Email = "a@x.com", PasswordHash = "x", ProfileImageUrl = "" });
            ctx.QuestionCategories.Add(new QuestionCategory { Name = "geography", ColorPaletteJson = "[\"#4CAF50\",\"#C8E6C9\"]" });
            await ctx.SaveChangesAsync();
        }

        await SeedAsync();

        await using var check = Context();
        var geography = await check.QuestionCategories.Where(c => c.Name.ToLower() == "geography").ToListAsync();
        Assert.Single(geography);
        Assert.Equal("[\"#4CAF50\",\"#C8E6C9\"]", geography[0].ColorPaletteJson);
        Assert.Equal(4, await check.Quizzes.CountAsync(q => q.CategoryId == geography[0].Id));
    }

    [Fact]
    public async Task An_edited_featured_quiz_is_not_overwritten()
    {
        await SeedAsync();
        await using (var ctx = Context())
        {
            var quiz = await ctx.Quizzes.SingleAsync(q => q.FeaturedKey == "science-easy");
            quiz.Title = "Renamed by an admin";
            await ctx.SaveChangesAsync();
        }

        await SeedAsync();

        await using var check = Context();
        Assert.Equal("Renamed by an admin", (await check.Quizzes.SingleAsync(q => q.FeaturedKey == "science-easy")).Title);
    }

    [Fact]
    public async Task A_deleted_featured_quiz_stays_deleted()
    {
        await SeedAsync();
        await using (var ctx = Context())
        {
            (await ctx.Quizzes.SingleAsync(q => q.FeaturedKey == "history-hard")).DeletedAt = DateTime.UtcNow;
            await ctx.SaveChangesAsync();
        }

        await SeedAsync();

        await using var check = Context();
        Assert.Equal(15, await check.Quizzes.CountAsync());
        Assert.Single(await check.Quizzes.IgnoreQueryFilters().Where(q => q.FeaturedKey == "history-hard").ToListAsync());
    }

    [Fact]
    public async Task A_missing_featured_quiz_is_recreated()
    {
        await SeedAsync();
        await using (var ctx = Context())
        {
            var quiz = await ctx.Quizzes.Include(q => q.QuizQuestions).SingleAsync(q => q.FeaturedKey == "geography-expert");
            ctx.RemoveRange(quiz.QuizQuestions);
            ctx.Quizzes.Remove(quiz);
            await ctx.SaveChangesAsync();
        }

        await SeedAsync();

        await using var check = Context();
        Assert.Equal(16, await check.Quizzes.CountAsync());
    }

    [Fact]
    public async Task Someone_already_called_oxygenquiz_keeps_the_name()
    {
        await using (var ctx = Context())
        {
            ctx.Users.Add(new User { Id = Guid.NewGuid(), Username = "OxygenQuiz", ImmutableName = "oxygenquiz", Email = "o@x.com", PasswordHash = "x", ProfileImageUrl = "" });
            await ctx.SaveChangesAsync();
        }

        await SeedAsync();

        await using var check = Context();
        var owner = await check.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == SystemAccount.Id);
        Assert.Equal(SystemAccount.FallbackImmutableName, owner.ImmutableName);
    }
}
