using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Models.Media;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Services.Media;
using QuizAPI.Tests.Associations;
using QuizAPI.Tests.TestSupport;

namespace QuizAPI.Tests.Media;

/// <summary>
/// An in-memory database, storage and clock for the media services. Each call gets a fresh
/// DbContext, the way each HTTP request does, so nothing passes between calls except what was saved.
/// </summary>
internal sealed class MediaWorld
{
    private readonly string _db = Guid.NewGuid().ToString();
    public readonly TestClock Clock = new();
    public readonly InMemoryMediaStorage Storage = new();
    public MediaOptions Options { get; } = new();
    public MediaQuota Quota { get; set; } = new() { DailyNew = 15, StorageBytes = 100L * 1024 * 1024 };

    public ApplicationDbContext Context() => new(
        new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(_db).Options,
        new TestCurrentUserService());

    private IMediaQuotaPolicy Policy =>
        Mock.Of<IMediaQuotaPolicy>(p => p.GetQuotaAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()) == Task.FromResult(Quota));

    public MediaService Uploads(ApplicationDbContext ctx) => new(
        new MediaRepository(ctx), Storage, Policy, Microsoft.Extensions.Options.Options.Create(Options), Clock,
        NullLogger<MediaService>.Instance);

    public MediaAttachmentService Attachments(ApplicationDbContext ctx) =>
        new(new MediaRepository(ctx), Policy, Clock);

    public MediaSweeper Sweeper(ApplicationDbContext ctx) => new(
        new MediaRepository(ctx), Storage, Microsoft.Extensions.Options.Options.Create(Options), Clock,
        NullLogger<MediaSweeper>.Instance);

    public async Task<Guid> Upload(byte[] bytes, Guid uploader)
    {
        await using var ctx = Context();
        return (await Uploads(ctx).UploadAsync(bytes, uploader)).Id;
    }

    /// <summary>A distinct small PNG per seed, so each is its own asset.</summary>
    public static byte[] Image(int seed) => MediaProcessorTests.Png(8 + seed, 8);

    /// <summary>Adds a bare true/false question owned by <paramref name="owner"/> and returns its id.</summary>
    public async Task<int> AddQuestion(Guid owner, Guid? assetId = null)
    {
        await using var ctx = Context();
        var q = new TrueFalseQuestion
        {
            Text = "Is this a test?", UserId = owner, Type = QuestionType.TrueFalse,
            CategoryId = 1, LanguageId = 1, DifficultyId = 1, CreatedAt = DateTime.UtcNow,
        };
        if (assetId is not null) await Attachments(ctx).ApplyToQuestionAsync(q, assetId, owner);
        ctx.Questions.Add(q);
        await ctx.SaveChangesAsync();
        return q.Id;
    }

    public async Task SetQuestionMedia(int questionId, Guid saver, Guid? assetId)
    {
        await using var ctx = Context();
        var q = await ctx.Questions.IgnoreQueryFilters().SingleAsync(x => x.Id == questionId);
        await Attachments(ctx).ApplyToQuestionAsync(q, assetId, saver);
        await ctx.SaveChangesAsync();
    }

    public async Task DeleteQuestion(int questionId)
    {
        await using var ctx = Context();
        ctx.Questions.Remove(await ctx.Questions.IgnoreQueryFilters().SingleAsync(x => x.Id == questionId));
        await ctx.SaveChangesAsync();
    }

    public async Task<MediaAsset?> Asset(Guid id)
    {
        await using var ctx = Context();
        return await ctx.MediaAssets.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
    }

    public async Task<QuestionBase> Question(int id)
    {
        await using var ctx = Context();
        return await ctx.Questions.IgnoreQueryFilters().AsNoTracking().SingleAsync(q => q.Id == id);
    }
}
