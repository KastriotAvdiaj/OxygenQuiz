using Microsoft.Extensions.Options;
using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.DTOs.Moderation;
using QuizAPI.Exceptions;
using QuizAPI.Models.Moderation;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Services.Moderation
{
    /// <summary>The <c>Moderation</c> configuration section. docs/media/moderation.md.</summary>
    public sealed class ModerationOptions
    {
        public const string Section = "Moderation";

        /// <summary>Distinct reporters of one harmful reason that hide content automatically. Ten,
        /// not three: three friends shouldn't be able to take down a quiz they dislike. Admins see a
        /// harmful report at the first one, so this is only the backstop.</summary>
        public int AutoHideThreshold { get; set; } = 10;

        /// <summary>A wrong-answer report reaches the admin queue after this many reports…</summary>
        public int AuthorEscalationCount { get; set; } = 5;

        /// <summary>…or this many days with the author.</summary>
        public int AuthorWindowDays { get; set; } = 7;
    }

    public interface IContentReportService
    {
        Task<ReportReceiptDTO> SubmitAsync(Guid reporterId, SubmitReportCM cm, CancellationToken ct = default);

        /// <summary>Open wrong-answer reports on the author's own questions and quizzes.</summary>
        Task<List<ReportTargetDTO>> ListReceivedAsync(Guid authorId, CancellationToken ct = default);

        /// <summary>The author resolves every open wrong-answer report on one target.</summary>
        Task<int> RespondAsync(Guid authorId, RespondToReportsCM cm, CancellationToken ct = default);
    }

    /// <summary>
    /// The reporting half of moderation: a viewer's report, the automatic hide at
    /// <see cref="ModerationOptions.AutoHideThreshold"/>, and the author's answer to wrong-answer
    /// reports. The moderator's half is <see cref="ModerationService"/>. docs/media/moderation.md.
    /// </summary>
    public sealed class ContentReportService(
        IModerationRepository repo,
        INotificationService notifications,
        IOptions<ModerationOptions> options,
        TimeProvider clock) : IContentReportService
    {
        private readonly ModerationOptions _o = options.Value;

        public async Task<ReportReceiptDTO> SubmitAsync(Guid reporterId, SubmitReportCM cm, CancellationToken ct = default)
        {
            if (!Enum.TryParse<ReportReason>(cm.Reason, ignoreCase: true, out var reason) || !Enum.IsDefined(reason))
                throw new AppValidationException("Choose a reason for the report.");

            var details = string.IsNullOrWhiteSpace(cm.Details) ? null : cm.Details.Trim();
            if (details is { Length: > ContentReport.MaxDetailsLength })
                throw new AppValidationException($"Keep the details under {ContentReport.MaxDetailsLength} characters.");
            if (reason == ReportReason.WrongAnswer && details is null)
                throw new AppValidationException("Tell us what the correct answer is, so the author can fix it.");
            if (reason == ReportReason.Other && details is null)
                throw new AppValidationException("Tell us what's wrong.");

            Guid authorId;
            string title;
            Models.QuestionBase? question = null;
            Models.Quiz.Quiz? quiz = null;

            if (cm.QuestionId is int questionId)
            {
                question = await repo.GetQuestionAsync(questionId, ct)
                    ?? throw new NotFoundException("That question no longer exists.");
                authorId = question.UserId;
                title = question.Text;
                if (cm.QuizId is int contextId && await repo.GetQuizAsync(contextId, ct) is null)
                    cm.QuizId = null; // context only; a stale quiz id doesn't invalidate the report
            }
            else if (cm.QuizId is int quizId)
            {
                quiz = await repo.GetQuizAsync(quizId, ct) ?? throw new NotFoundException("That quiz no longer exists.");
                authorId = quiz.UserId;
                title = quiz.Title;
            }
            else
            {
                throw new AppValidationException("Say which question or quiz you're reporting.");
            }

            if (authorId == reporterId)
                throw new AppValidationException("You can't report your own content — edit it instead.");
            if (await repo.HasOpenReportAsync(reporterId, cm.QuestionId, cm.QuestionId is null ? cm.QuizId : null, ct))
                throw new ConflictException("You've already reported this. We'll let you know what happens.");

            var report = new ContentReport
            {
                Id = Guid.NewGuid(),
                QuestionId = cm.QuestionId,
                QuizId = cm.QuizId,
                ReporterId = reporterId,
                Reason = reason,
                Details = details,
                CreatedAt = clock.GetUtcNow().UtcDateTime,
            };
            await repo.AddReportAsync(report, ct);
            await repo.SaveChangesAsync(ct);

            if (ContentReport.IsHarmful(reason))
                await AutoHideIfThresholdAsync(question, quiz, reason, ct);
            else if (reason == ReportReason.WrongAnswer && !await repo.IsStaffAsync(authorId, ct))
                // Staff content skips the author step — its reports go straight to the admin queue.
                await notifications.CreateAsync(authorId, "report", "Someone thinks an answer is wrong",
                    $"On \"{Shorten(title)}\": {Shorten(details!, 300)} — open My Dashboard → Reports to fix it or reply.", ct);

            return new ReportReceiptDTO { Id = report.Id, Reason = reason.ToString(), CreatedAt = report.CreatedAt };
        }

        /// <summary>
        /// At <see cref="ModerationOptions.AutoHideThreshold"/> distinct reporters: an image or clip
        /// reported on a question is hidden behind a cover; offensive text holds every quiz the question
        /// is live in; any harmful report on a quiz holds the quiz. Never one question removed from a
        /// quiz — that would change its count, its scoring and games in progress.
        /// </summary>
        private async Task AutoHideIfThresholdAsync(Models.QuestionBase? question, Models.Quiz.Quiz? quiz, ReportReason reason, CancellationToken ct)
        {
            var reporters = await repo.CountOpenReportersAsync(question?.Id, quiz?.Id, reason, ct);
            if (reporters < _o.AutoHideThreshold) return;

            var now = clock.GetUtcNow().UtcDateTime;
            if (question is not null && reason == ReportReason.InappropriateMedia)
            {
                if (question.MediaAssetId is not null) question.MediaHiddenAt ??= now;
            }
            else if (question is not null)
            {
                foreach (var held in await repo.GetQuizzesWithLiveQuestionAsync(question.Id, ct))
                    held.ModerationHeldAt ??= now;
            }
            else if (quiz is not null)
            {
                quiz.ModerationHeldAt ??= now;
            }
            await repo.SaveChangesAsync(ct);
        }

        public async Task<List<ReportTargetDTO>> ListReceivedAsync(Guid authorId, CancellationToken ct = default)
        {
            var reports = await repo.ListOpenWrongAnswerForAuthorAsync(authorId, ct);
            return ReportTargets.Group(reports, _ => "WithAuthor", new Dictionary<Guid, string>(), clock);
        }

        public async Task<int> RespondAsync(Guid authorId, RespondToReportsCM cm, CancellationToken ct = default)
        {
            if (!Enum.TryParse<ReportOutcome>(cm.Outcome, true, out var outcome)
                || outcome is not (ReportOutcome.Fixed or ReportOutcome.NotAMistake))
                throw new AppValidationException("Answer with Fixed or Not a mistake.");
            var note = string.IsNullOrWhiteSpace(cm.Note) ? null : cm.Note.Trim();
            if (note is { Length: > ContentReport.MaxNoteLength })
                throw new AppValidationException($"Keep the reply under {ContentReport.MaxNoteLength} characters.");
            if (outcome == ReportOutcome.NotAMistake && note is null)
                throw new AppValidationException("Say why the answer is right — the people who reported it will see your reply.");

            string title;
            if (cm.QuestionId is int qid)
            {
                var q = await repo.GetQuestionAsync(qid, ct);
                if (q is null || q.UserId != authorId) throw new NotFoundException("Question not found.");
                title = q.Text;
            }
            else if (cm.QuizId is int zid)
            {
                var z = await repo.GetQuizAsync(zid, ct);
                if (z is null || z.UserId != authorId) throw new NotFoundException("Quiz not found.");
                title = z.Title;
            }
            else throw new AppValidationException("Say which question or quiz you're answering.");

            var open = (await repo.GetOpenReportsAsync(cm.QuestionId, cm.QuestionId is null ? cm.QuizId : null, ct))
                .Where(r => r.Reason == ReportReason.WrongAnswer).ToList();
            var now = clock.GetUtcNow().UtcDateTime;
            foreach (var r in open)
            {
                r.Status = ReportStatus.Resolved;
                r.Outcome = outcome;
                r.ResolutionNote = note;
                r.ResolvedById = authorId;
                r.ResolvedAt = now;
            }
            await repo.SaveChangesAsync(ct);

            var message = outcome == ReportOutcome.Fixed
                ? $"Thanks — the author fixed \"{Shorten(title)}\" after your report."
                : $"The author reviewed \"{Shorten(title)}\" and says it's correct: {Shorten(note!, 300)}";
            foreach (var reporter in open.Select(r => r.ReporterId).Distinct())
                await notifications.CreateAsync(reporter, "report", "Your report was answered", message, ct);
            return open.Count;
        }

        internal static string Shorten(string s, int max = 80) => s.Length <= max ? s : s[..(max - 1)].TrimEnd() + "…";
    }
}
