using Microsoft.EntityFrameworkCore;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Models.Media;
using QuizAPI.Models.Quiz;
using QuizAPI.Services.Media;
using Xunit;

namespace QuizAPI.Tests.Media;

/// <summary>
/// The pipeline's rules end to end over an in-memory database: upload, dedup, the unsaved cap, the
/// quota charged on save, and the sweep. docs/media/media-pipeline.md.
/// </summary>
public class MediaPipelineTests
{
    private static readonly Guid Alice = Guid.NewGuid();
    private static readonly Guid Bob = Guid.NewGuid();

    // ── Upload ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task An_upload_stores_a_webp_and_its_thumbnail_and_attaches_nothing()
    {
        var world = new MediaWorld();
        var id = await world.Upload(MediaWorld.Image(1), Alice);

        var asset = await world.Asset(id);
        Assert.NotNull(asset);
        Assert.Equal(MediaKind.Image, asset!.Kind);
        Assert.Equal("image/webp", asset.ContentType);
        Assert.Equal($"https://media.test/{asset.StorageKey}", asset.Url);
        Assert.True(world.Storage.Objects.ContainsKey(asset.StorageKey));
        Assert.True(world.Storage.Objects.ContainsKey(asset.ThumbKey!));
        Assert.Null(asset.FirstAttachedAt);
    }

    [Fact]
    public async Task The_same_bytes_uploaded_twice_are_one_asset()
    {
        var world = new MediaWorld();
        var first = await world.Upload(MediaWorld.Image(1), Alice);
        var second = await world.Upload(MediaWorld.Image(1), Bob);

        Assert.Equal(first, second);
        await using var ctx = world.Context();
        Assert.Equal(1, await ctx.MediaAssets.CountAsync());
        Assert.Equal(2, world.Storage.Objects.Count); // main + thumb, once
    }

    [Fact]
    public async Task An_unsupported_file_is_refused_and_nothing_is_stored()
    {
        var world = new MediaWorld();
        await Assert.ThrowsAsync<AppValidationException>(() =>
            world.Upload(System.Text.Encoding.UTF8.GetBytes("<svg onload=alert(1)>"), Alice));
        Assert.Empty(world.Storage.Objects);
    }

    [Fact]
    public async Task The_unsaved_pile_is_capped_per_account_and_duplicates_dont_count()
    {
        var world = new MediaWorld();
        world.Options.MaxUnsavedPerUser = 2;
        await world.Upload(MediaWorld.Image(1), Alice);
        await world.Upload(MediaWorld.Image(2), Alice);

        await Assert.ThrowsAsync<QuotaExceededException>(() => world.Upload(MediaWorld.Image(3), Alice));
        await world.Upload(MediaWorld.Image(1), Alice); // already stored: adds nothing to the pile
        await world.Upload(MediaWorld.Image(3), Bob);   // the cap is per account
    }

    [Fact]
    public async Task Saving_frees_a_slot_in_the_unsaved_pile()
    {
        var world = new MediaWorld();
        world.Options.MaxUnsavedPerUser = 1;
        var a = await world.Upload(MediaWorld.Image(1), Alice);
        await world.AddQuestion(Alice, a);

        await world.Upload(MediaWorld.Image(2), Alice);
    }

    [Fact]
    public async Task A_file_moderators_removed_cant_be_uploaded_again()
    {
        var world = new MediaWorld();
        var id = await world.Upload(MediaWorld.Image(1), Alice);
        await using (var ctx = world.Context())
        {
            (await ctx.MediaAssets.SingleAsync(a => a.Id == id)).RemovedAt = DateTime.UtcNow;
            await ctx.SaveChangesAsync();
        }

        await Assert.ThrowsAsync<AppValidationException>(() => world.Upload(MediaWorld.Image(1), Bob));
    }

    // ── Attaching on save ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task A_save_copies_the_assets_url_and_kind_onto_the_question()
    {
        var world = new MediaWorld();
        var id = await world.Upload(MediaWorld.Image(1), Alice);
        var q = await world.AddQuestion(Alice, id);

        var question = await world.Question(q);
        var asset = await world.Asset(id);
        Assert.Equal(id, question.MediaAssetId);
        Assert.Equal(asset!.Url, question.MediaUrl);
        Assert.Equal(QuestionMediaType.Image, question.MediaType);
        Assert.NotNull(asset.FirstAttachedAt);
    }

    [Fact]
    public async Task An_unknown_asset_id_is_refused()
    {
        var world = new MediaWorld();
        await Assert.ThrowsAsync<AppValidationException>(() => world.AddQuestion(Alice, Guid.NewGuid()));
    }

    [Fact]
    public async Task A_removed_asset_cant_be_attached()
    {
        var world = new MediaWorld();
        var id = await world.Upload(MediaWorld.Image(1), Alice);
        await using (var ctx = world.Context())
        {
            (await ctx.MediaAssets.SingleAsync(a => a.Id == id)).RemovedAt = DateTime.UtcNow;
            await ctx.SaveChangesAsync();
        }
        await Assert.ThrowsAsync<AppValidationException>(() => world.AddQuestion(Alice, id));
    }

    [Fact]
    public async Task A_quiz_cover_must_be_an_image()
    {
        var world = new MediaWorld();
        var clip = File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "Media", "Fixtures", "tone-3s.ogg"));
        var id = await world.Upload(clip, Alice);

        await using var ctx = world.Context();
        var quiz = new Quiz { Title = "Q", UserId = Alice };
        await Assert.ThrowsAsync<AppValidationException>(() => world.Attachments(ctx).ApplyToQuizCoverAsync(quiz, id, Alice));
    }

    [Fact]
    public async Task Uploading_costs_nothing_saving_is_charged()
    {
        var world = new MediaWorld();
        world.Quota = new MediaQuota { DailyNew = 1 };
        // Five uploads and swaps before saving: none of them count.
        for (var i = 1; i <= 5; i++) await world.Upload(MediaWorld.Image(i), Alice);
        var keep = await world.Upload(MediaWorld.Image(6), Alice);

        await world.AddQuestion(Alice, keep);

        var question = (await world.Question(1));
        Assert.NotNull(question.MediaCountedAt);
    }

    [Fact]
    public async Task The_daily_count_stops_at_the_limit()
    {
        var world = new MediaWorld();
        world.Quota = new MediaQuota { DailyNew = 2 };
        await world.AddQuestion(Alice, await world.Upload(MediaWorld.Image(1), Alice));
        await world.AddQuestion(Alice, await world.Upload(MediaWorld.Image(2), Alice));

        var third = await world.Upload(MediaWorld.Image(3), Alice);
        await Assert.ThrowsAsync<QuotaExceededException>(() => world.AddQuestion(Alice, third));

        // It resets at UTC midnight.
        world.Clock.Advance(TimeSpan.FromDays(1).TotalSeconds);
        await world.AddQuestion(Alice, third);
    }

    [Fact]
    public async Task Reusing_an_image_you_already_use_is_free()
    {
        // A builder copy of a question (ADR 0030) and the same flag on two questions both reuse an
        // asset the author already has; neither should spend the day's allowance.
        var world = new MediaWorld();
        world.Quota = new MediaQuota { DailyNew = 1 };
        var flag = await world.Upload(MediaWorld.Image(1), Alice);
        await world.AddQuestion(Alice, flag);

        var copy = await world.AddQuestion(Alice, flag);

        Assert.Null((await world.Question(copy)).MediaCountedAt);
    }

    [Fact]
    public async Task Keeping_the_same_image_on_an_edit_is_not_a_new_attachment()
    {
        var world = new MediaWorld();
        world.Quota = new MediaQuota { DailyNew = 1 };
        var id = await world.Upload(MediaWorld.Image(1), Alice);
        var q = await world.AddQuestion(Alice, id);
        var countedAt = (await world.Question(q)).MediaCountedAt;

        await world.SetQuestionMedia(q, Alice, id); // the editor sends the same asset back

        Assert.Equal(countedAt, (await world.Question(q)).MediaCountedAt);
    }

    [Fact]
    public async Task The_storage_limit_counts_distinct_files_in_your_content()
    {
        var world = new MediaWorld();
        var a = await world.Upload(MediaWorld.Image(1), Alice);
        var b = await world.Upload(MediaWorld.Image(2), Alice);
        var size = (await world.Asset(a))!.ByteSize;
        world.Quota = new MediaQuota { StorageBytes = size + (await world.Asset(b))!.ByteSize - 1 };

        await world.AddQuestion(Alice, a);
        await world.AddQuestion(Alice, a); // the same file twice weighs once
        await Assert.ThrowsAsync<QuotaExceededException>(() => world.AddQuestion(Alice, b));
    }

    [Fact]
    public async Task Several_attachments_in_one_save_are_counted_together()
    {
        // The AI import attaches media to many questions before one SaveChanges. The database
        // can't see the first ones yet, so the service must add them up itself.
        var world = new MediaWorld();
        world.Quota = new MediaQuota { DailyNew = 2 };
        var ids = new List<Guid>();
        for (var i = 1; i <= 3; i++) ids.Add(await world.Upload(MediaWorld.Image(i), Alice));

        await using var ctx = world.Context();
        var attach = world.Attachments(ctx);
        await attach.ApplyToQuestionAsync(new TrueFalseQuestion { UserId = Alice }, ids[0], Alice);
        await attach.ApplyToQuestionAsync(new TrueFalseQuestion { UserId = Alice }, ids[1], Alice);
        await Assert.ThrowsAsync<QuotaExceededException>(() =>
            attach.ApplyToQuestionAsync(new TrueFalseQuestion { UserId = Alice }, ids[2], Alice));
    }

    [Fact]
    public async Task Clearing_media_removes_every_trace_from_the_question()
    {
        var world = new MediaWorld();
        var q = await world.AddQuestion(Alice, await world.Upload(MediaWorld.Image(1), Alice));

        await world.SetQuestionMedia(q, Alice, null);

        var question = await world.Question(q);
        Assert.Null(question.MediaAssetId);
        Assert.Null(question.MediaUrl);
        Assert.Equal(QuestionMediaType.None, question.MediaType);
    }

    // ── The sweep ───────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task A_never_saved_upload_is_kept_for_24_hours_then_deleted()
    {
        var world = new MediaWorld();
        var id = await world.Upload(MediaWorld.Image(1), Alice);
        var key = (await world.Asset(id))!.StorageKey;

        world.Clock.Advance(TimeSpan.FromHours(23).TotalSeconds);
        await using (var ctx = world.Context()) await world.Sweeper(ctx).RunAsync();
        Assert.NotNull(await world.Asset(id));

        world.Clock.Advance(TimeSpan.FromHours(2).TotalSeconds);
        await using (var ctx = world.Context()) await world.Sweeper(ctx).RunAsync();
        Assert.Null(await world.Asset(id));
        Assert.Empty(world.Storage.Objects);
        Assert.False(world.Storage.Objects.ContainsKey(key));
    }

    [Fact]
    public async Task A_file_in_use_is_never_deleted()
    {
        var world = new MediaWorld();
        var id = await world.Upload(MediaWorld.Image(1), Alice);
        await world.AddQuestion(Alice, id);

        world.Clock.Advance(TimeSpan.FromDays(60).TotalSeconds);
        await using (var ctx = world.Context()) await world.Sweeper(ctx).RunAsync();

        Assert.NotNull(await world.Asset(id));
        Assert.NotEmpty(world.Storage.Objects);
    }

    [Fact]
    public async Task A_replaced_image_is_kept_7_days_then_deleted()
    {
        var world = new MediaWorld();
        var old = await world.Upload(MediaWorld.Image(1), Alice);
        var q = await world.AddQuestion(Alice, old);
        await world.SetQuestionMedia(q, Alice, await world.Upload(MediaWorld.Image(2), Alice));

        await using (var ctx = world.Context()) await world.Sweeper(ctx).RunAsync();
        Assert.NotNull((await world.Asset(old))!.UnreferencedSince); // stamped, not deleted

        world.Clock.Advance(TimeSpan.FromDays(6).TotalSeconds);
        await using (var ctx = world.Context()) await world.Sweeper(ctx).RunAsync();
        Assert.NotNull(await world.Asset(old));

        world.Clock.Advance(TimeSpan.FromDays(1.1).TotalSeconds);
        await using (var ctx = world.Context()) await world.Sweeper(ctx).RunAsync();
        Assert.Null(await world.Asset(old));
    }

    [Fact]
    public async Task Deleting_a_question_doesnt_delete_an_image_its_copy_still_uses()
    {
        var world = new MediaWorld();
        var id = await world.Upload(MediaWorld.Image(1), Alice);
        var original = await world.AddQuestion(Alice, id);
        await world.AddQuestion(Alice, id); // the builder's copy (ADR 0030)

        await world.DeleteQuestion(original);
        world.Clock.Advance(TimeSpan.FromDays(30).TotalSeconds);
        await using (var ctx = world.Context()) await world.Sweeper(ctx).RunAsync();

        Assert.NotNull(await world.Asset(id));
    }

    [Fact]
    public async Task An_image_put_back_within_the_grace_is_unstamped_and_kept()
    {
        var world = new MediaWorld();
        var id = await world.Upload(MediaWorld.Image(1), Alice);
        var q = await world.AddQuestion(Alice, id);
        await world.SetQuestionMedia(q, Alice, null);
        await using (var ctx = world.Context()) await world.Sweeper(ctx).RunAsync();
        Assert.NotNull((await world.Asset(id))!.UnreferencedSince);

        world.Clock.Advance(TimeSpan.FromDays(3).TotalSeconds);
        await world.SetQuestionMedia(q, Alice, id); // the author changed their mind
        world.Clock.Advance(TimeSpan.FromDays(10).TotalSeconds);
        await using (var ctx = world.Context()) await world.Sweeper(ctx).RunAsync();

        Assert.Null((await world.Asset(id))!.UnreferencedSince);
    }

    [Fact]
    public async Task A_moderation_tombstone_is_never_swept()
    {
        var world = new MediaWorld();
        var id = await world.Upload(MediaWorld.Image(1), Alice);
        await using (var ctx = world.Context())
        {
            (await ctx.MediaAssets.SingleAsync(a => a.Id == id)).RemovedAt = DateTime.UtcNow;
            await ctx.SaveChangesAsync();
        }

        world.Clock.Advance(TimeSpan.FromDays(60).TotalSeconds);
        await using (var ctx = world.Context()) await world.Sweeper(ctx).RunAsync();

        Assert.NotNull(await world.Asset(id)); // its row is what blocks a re-upload
    }

    [Fact]
    public async Task If_the_bucket_is_unreachable_the_sweep_logs_and_carries_on()
    {
        var world = new MediaWorld();
        await world.Upload(MediaWorld.Image(1), Alice);
        world.Storage.FailDeletes = true;
        world.Clock.Advance(TimeSpan.FromDays(2).TotalSeconds);

        await using var ctx = world.Context();
        var result = await world.Sweeper(ctx).RunAsync(); // must not throw

        Assert.Equal(1, result.DeletedNeverAttached);
    }
}
