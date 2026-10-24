using Microsoft.EntityFrameworkCore;
using QuizAPI.DTOs.Moderation;
using QuizAPI.Exceptions;
using QuizAPI.Models.Moderation;
using QuizAPI.Services.Moderation;
using Xunit;

namespace QuizAPI.Tests.Moderation;

/// <summary>
/// Reports, the automatic hide, the author's answer, the admin lanes and every moderation action.
/// docs/media/moderation.md.
/// </summary>
public class ModerationTests
{
    private static readonly Guid Author = ModerationWorld.Author;

    // ── Submitting ──────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task A_wrong_answer_report_needs_the_correct_answer()
    {
        var w = new ModerationWorld();
        await Assert.ThrowsAsync<AppValidationException>(() =>
            w.With(c => w.Reports(c).SubmitAsync(w.Reporters[0], new SubmitReportCM { QuestionId = w.QuestionId, Reason = "WrongAnswer" })));
        await w.Report(w.Reporters[0], "WrongAnswer", w.QuestionId, details: "It's blue.");
    }

    [Fact]
    public async Task An_unknown_reason_or_no_target_is_refused()
    {
        var w = new ModerationWorld();
        await Assert.ThrowsAsync<AppValidationException>(() => w.Report(w.Reporters[0], "Boring", w.QuestionId));
        await Assert.ThrowsAsync<AppValidationException>(() => w.Report(w.Reporters[0], "Spam"));
    }

    [Fact]
    public async Task You_cant_report_your_own_content()
    {
        var w = new ModerationWorld();
        await Assert.ThrowsAsync<AppValidationException>(() => w.Report(Author, "Spam", w.QuestionId));
    }

    [Fact]
    public async Task One_open_report_per_person_per_item()
    {
        var w = new ModerationWorld();
        await w.Report(w.Reporters[0], "Spam", w.QuestionId);
        await Assert.ThrowsAsync<ConflictException>(() => w.Report(w.Reporters[0], "Offensive", w.QuestionId));
        await w.Report(w.Reporters[0], "Spam", quizId: w.QuizId); // the quiz is a different item
        await w.Report(w.Reporters[1], "Spam", w.QuestionId);     // and it's per person
    }

    [Fact]
    public async Task A_resolved_report_doesnt_block_a_new_one()
    {
        var w = new ModerationWorld();
        await w.Report(w.Reporters[0], "Spam", w.QuestionId);
        await w.With(c => w.Moderation(c).ResolveAsync(ModerationWorld.Staff, new ResolveReportsCM { QuestionId = w.QuestionId, Outcome = "Rejected" }));

        await w.Report(w.Reporters[0], "Spam", w.QuestionId);
    }

    [Fact]
    public async Task A_wrong_answer_report_goes_to_the_author_with_the_reporters_words()
    {
        var w = new ModerationWorld();
        await w.Report(w.Reporters[0], "WrongAnswer", w.QuestionId, details: "The sky is blue, not green.");

        var sent = Assert.Single(w.Sent);
        Assert.Equal(Author, sent.UserId);
        Assert.Contains("The sky is blue, not green.", sent.Message);
    }

    [Fact]
    public async Task Staff_content_skips_the_author_step()
    {
        var w = new ModerationWorld();
        await w.Report(w.Reporters[0], "WrongAnswer", w.StaffQuestionId);

        Assert.Empty(w.Sent);
        var lane = await w.With(c => w.Moderation(c).ListLaneAsync(ReportLane.NeedsAttention));
        Assert.Contains(lane, t => t.QuestionId == w.StaffQuestionId);
    }

    // ── The automatic hide ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task Ten_inappropriate_media_reports_hide_the_image_nine_dont()
    {
        var w = new ModerationWorld();
        for (var i = 0; i < 9; i++) await w.Report(w.Reporters[i], "InappropriateMedia", w.QuestionId);
        Assert.Null((await w.Question(w.QuestionId)).MediaHiddenAt);

        await w.Report(w.Reporters[9], "InappropriateMedia", w.QuestionId);

        var q = await w.Question(w.QuestionId);
        Assert.NotNull(q.MediaHiddenAt);
        Assert.Equal(w.AssetId, q.MediaAssetId); // hidden, not removed
        Assert.Null((await w.Quiz(w.QuizId)).ModerationHeldAt); // and the quiz still plays
    }

    [Fact]
    public async Task Wrong_answer_reports_never_hide_anything()
    {
        var w = new ModerationWorld();
        for (var i = 0; i < 12; i++) await w.Report(w.Reporters[i], "WrongAnswer", w.QuestionId);

        Assert.Null((await w.Question(w.QuestionId)).MediaHiddenAt);
        Assert.Null((await w.Quiz(w.QuizId)).ModerationHeldAt);
    }

    [Fact]
    public async Task Offensive_text_holds_every_quiz_the_question_is_live_in()
    {
        var w = new ModerationWorld();
        for (var i = 0; i < 10; i++) await w.Report(w.Reporters[i], "Offensive", w.QuestionId);

        Assert.NotNull((await w.Quiz(w.QuizId)).ModerationHeldAt);
        Assert.NotNull((await w.Quiz(w.OtherQuizId)).ModerationHeldAt);
        Assert.Null((await w.Question(w.QuestionId)).MediaHiddenAt);
    }

    [Fact]
    public async Task Ten_harmful_reports_on_a_quiz_hold_it()
    {
        var w = new ModerationWorld();
        for (var i = 0; i < 10; i++) await w.Report(w.Reporters[i], "InappropriateMedia", quizId: w.QuizId);

        Assert.NotNull((await w.Quiz(w.QuizId)).ModerationHeldAt);
        Assert.Null((await w.Quiz(w.OtherQuizId)).ModerationHeldAt);
    }

    [Fact]
    public async Task The_threshold_is_configurable()
    {
        var w = new ModerationWorld();
        w.Options.AutoHideThreshold = 2;
        await w.Report(w.Reporters[0], "InappropriateMedia", w.QuestionId);
        await w.Report(w.Reporters[1], "InappropriateMedia", w.QuestionId);
        Assert.NotNull((await w.Question(w.QuestionId)).MediaHiddenAt);
    }

    // ── The author's answer ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task The_author_sees_only_wrong_answer_reports_on_their_own_content()
    {
        var w = new ModerationWorld();
        await w.Report(w.Reporters[0], "WrongAnswer", w.QuestionId);
        await w.Report(w.Reporters[1], "Offensive", w.QuestionId);   // a moderator's matter
        await w.Report(w.Reporters[2], "WrongAnswer", w.StaffQuestionId);

        var received = await w.With(c => w.Reports(c).ListReceivedAsync(Author));

        var target = Assert.Single(received);
        Assert.Equal(w.QuestionId, target.QuestionId);
        Assert.Equal(1, target.OpenCount);
    }

    [Fact]
    public async Task Fixed_resolves_every_wrong_answer_report_and_tells_each_reporter()
    {
        var w = new ModerationWorld();
        await w.Report(w.Reporters[0], "WrongAnswer", w.QuestionId);
        await w.Report(w.Reporters[1], "WrongAnswer", w.QuestionId);
        await w.Report(w.Reporters[2], "Spam", w.QuestionId);
        w.Sent.Clear();

        var resolved = await w.With(c => w.Reports(c).RespondAsync(Author, new RespondToReportsCM { QuestionId = w.QuestionId, Outcome = "Fixed" }));

        Assert.Equal(2, resolved);
        Assert.Equal(new[] { w.Reporters[0], w.Reporters[1] }.OrderBy(x => x), w.Sent.Select(s => s.UserId).OrderBy(x => x));
        var stillOpen = await w.With(c => c.ContentReports.CountAsync(r => r.Status == ReportStatus.Open));
        Assert.Equal(1, stillOpen); // the spam report is the moderators'
    }

    [Fact]
    public async Task Not_a_mistake_needs_a_reason_and_the_reporters_see_it()
    {
        var w = new ModerationWorld();
        await w.Report(w.Reporters[0], "WrongAnswer", w.QuestionId);
        w.Sent.Clear();

        await Assert.ThrowsAsync<AppValidationException>(() =>
            w.With(c => w.Reports(c).RespondAsync(Author, new RespondToReportsCM { QuestionId = w.QuestionId, Outcome = "NotAMistake" })));
        await w.With(c => w.Reports(c).RespondAsync(Author,
            new RespondToReportsCM { QuestionId = w.QuestionId, Outcome = "NotAMistake", Note = "It's a trick question about Mars." }));

        Assert.Contains("trick question about Mars", Assert.Single(w.Sent).Message);
    }

    [Fact]
    public async Task Only_the_author_can_answer()
    {
        var w = new ModerationWorld();
        await w.Report(w.Reporters[0], "WrongAnswer", w.QuestionId);
        await Assert.ThrowsAsync<NotFoundException>(() =>
            w.With(c => w.Reports(c).RespondAsync(w.Reporters[1], new RespondToReportsCM { QuestionId = w.QuestionId, Outcome = "Fixed" })));
    }

    // ── Lanes ───────────────────────────────────────────────────────────────────────────

    private static async Task<string?> LaneOf(ModerationWorld w, int? questionId = null, int? quizId = null)
    {
        foreach (var lane in Enum.GetValues<ReportLane>())
        {
            var rows = await w.With(c => w.Moderation(c).ListLaneAsync(lane));
            if (rows.Any(r => (questionId != null && r.QuestionId == questionId && r.TargetType == "Question")
                              || (quizId != null && r.QuizId == quizId && r.TargetType == "Quiz")))
                return lane.ToString();
        }
        return null;
    }

    [Fact]
    public async Task A_harmful_report_is_urgent_at_the_first_one()
    {
        var w = new ModerationWorld();
        await w.Report(w.Reporters[0], "InappropriateMedia", w.QuestionId);
        Assert.Equal("Urgent", await LaneOf(w, w.QuestionId));
    }

    [Fact]
    public async Task A_fresh_wrong_answer_waits_with_the_author_then_escalates_after_7_days()
    {
        var w = new ModerationWorld();
        await w.Report(w.Reporters[0], "WrongAnswer", w.QuestionId);
        Assert.Equal("WithAuthor", await LaneOf(w, w.QuestionId));

        w.Clock.Advance(TimeSpan.FromDays(7.1).TotalSeconds);
        Assert.Equal("NeedsAttention", await LaneOf(w, w.QuestionId));
    }

    [Fact]
    public async Task Five_wrong_answer_reports_escalate_at_once()
    {
        var w = new ModerationWorld();
        for (var i = 0; i < 5; i++) await w.Report(w.Reporters[i], "WrongAnswer", w.QuestionId);
        Assert.Equal("NeedsAttention", await LaneOf(w, w.QuestionId));
    }

    [Fact]
    public async Task Spam_copyright_and_other_need_attention()
    {
        var w = new ModerationWorld();
        await w.Report(w.Reporters[0], "Copyright", quizId: w.QuizId);
        Assert.Equal("NeedsAttention", await LaneOf(w, quizId: w.QuizId));
    }

    [Fact]
    public async Task Reporters_are_never_named_in_the_queue()
    {
        var w = new ModerationWorld();
        await w.Report(w.Reporters[0], "Spam", w.QuestionId);
        var row = Assert.Single(await w.With(c => w.Moderation(c).ListLaneAsync(ReportLane.NeedsAttention)));
        Assert.Equal("author", row.Author);
        Assert.DoesNotContain(typeof(ReportEntryDTO).GetProperties(), p => p.Name.Contains("Reporter"));
    }

    // ── Moderator actions ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Rejecting_restores_the_hidden_image_and_releases_the_holds()
    {
        var w = new ModerationWorld();
        w.Options.AutoHideThreshold = 1;
        await w.Report(w.Reporters[0], "InappropriateMedia", w.QuestionId);
        await w.Report(w.Reporters[1], "Offensive", w.QuestionId);
        Assert.NotNull((await w.Question(w.QuestionId)).MediaHiddenAt);
        Assert.NotNull((await w.Quiz(w.QuizId)).ModerationHeldAt);
        w.Sent.Clear();

        await w.With(c => w.Moderation(c).ResolveAsync(ModerationWorld.Staff, new ResolveReportsCM { QuestionId = w.QuestionId, Outcome = "Rejected" }));

        Assert.Null((await w.Question(w.QuestionId)).MediaHiddenAt);
        Assert.Null((await w.Quiz(w.QuizId)).ModerationHeldAt);
        Assert.Equal(2, w.Sent.Count); // each reporter hears the outcome
        Assert.Equal("Resolved", await LaneOf(w, w.QuestionId));
    }

    [Fact]
    public async Task Upholding_with_remove_takes_the_file_out_everywhere_and_blocks_it()
    {
        var w = new ModerationWorld();
        await w.Report(w.Reporters[0], "InappropriateMedia", w.QuestionId);

        await w.With(c => w.Moderation(c).ResolveAsync(ModerationWorld.Staff,
            new ResolveReportsCM { QuestionId = w.QuestionId, Outcome = "Upheld", RemoveMedia = true }));

        var q = await w.Question(w.QuestionId);
        Assert.Null(q.MediaAssetId);
        Assert.Null(q.MediaUrl);
        var cover = await w.Quiz(w.QuizId);
        Assert.Null(cover.CoverAssetId); // the same file as the quiz's cover went too
        var asset = await w.With(c => c.MediaAssets.AsNoTracking().SingleAsync(a => a.Id == w.AssetId));
        Assert.NotNull(asset.RemovedAt); // tombstone: the same bytes can't come back
        Assert.Empty(w.Storage.Objects);
    }

    [Fact]
    public async Task An_upheld_harmful_report_unpicks_a_picked_quiz()
    {
        var w = new ModerationWorld();
        await w.With(c => w.Moderation(c).SetQuizPickedAsync(ModerationWorld.Staff, w.QuizId, true).ContinueWith(_ => 0));
        await w.Report(w.Reporters[0], "Offensive", quizId: w.QuizId);

        await w.With(c => w.Moderation(c).ResolveAsync(ModerationWorld.Staff,
            new ResolveReportsCM { QuizId = w.QuizId, Outcome = "Upheld", HoldQuiz = true }));

        var quiz = await w.Quiz(w.QuizId);
        Assert.False(quiz.IsPicked);
        Assert.NotNull(quiz.ModerationHeldAt);
    }

    [Fact]
    public async Task Picking_a_community_quiz_tells_its_author()
    {
        var w = new ModerationWorld();
        await w.With(c => w.Moderation(c).SetQuizPickedAsync(ModerationWorld.Staff, w.QuizId, true).ContinueWith(_ => 0));

        Assert.True((await w.Quiz(w.QuizId)).IsPicked);
        Assert.Equal(Author, Assert.Single(w.Sent).UserId);
    }

    [Fact]
    public async Task Only_a_public_unheld_quiz_can_be_picked()
    {
        var w = new ModerationWorld();
        await w.With(c => w.Moderation(c).SetQuizHeldAsync(ModerationWorld.Staff, w.QuizId, true).ContinueWith(_ => 0));
        await Assert.ThrowsAsync<AppValidationException>(() =>
            w.With(c => w.Moderation(c).SetQuizPickedAsync(ModerationWorld.Staff, w.QuizId, true).ContinueWith(t => { t.GetAwaiter().GetResult(); return 0; })));
    }

    [Fact]
    public async Task Hide_and_show_media_by_hand()
    {
        var w = new ModerationWorld();
        await w.With(c => w.Moderation(c).SetMediaHiddenAsync(ModerationWorld.Staff, w.QuestionId, true).ContinueWith(_ => 0));
        Assert.NotNull((await w.Question(w.QuestionId)).MediaHiddenAt);
        await w.With(c => w.Moderation(c).SetMediaHiddenAsync(ModerationWorld.Staff, w.QuestionId, false).ContinueWith(_ => 0));
        Assert.Null((await w.Question(w.QuestionId)).MediaHiddenAt);
    }
}
