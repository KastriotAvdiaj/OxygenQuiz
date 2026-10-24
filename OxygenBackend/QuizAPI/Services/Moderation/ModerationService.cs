using Microsoft.Extensions.Options;
using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.DTOs.Moderation;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Models.Moderation;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Media;

namespace QuizAPI.Services.Moderation
{
    /// <summary>The four admin queues. docs/media/moderation.md, "The admin lanes".</summary>
    public enum ReportLane
    {
        /// <summary>Any harmful report, and anything hidden or held.</summary>
        Urgent,
        /// <summary>Wrong answers the author left unresolved; spam, copyright and other.</summary>
        NeedsAttention,
        /// <summary>Wrong answers still within the author's window — visible, nothing to do yet.</summary>
        WithAuthor,
        Resolved,
    }

    /// <summary>Groups reports into one row per reported thing, and decides each row's lane.</summary>
    internal static class ReportTargets
    {
        public static List<ReportTargetDTO> Group(
            IEnumerable<ContentReport> reports,
            Func<IGrouping<(int?, int?), ContentReport>, string> lane,
            IReadOnlyDictionary<Guid, string> usernames,
            TimeProvider clock)
        {
            return reports
                .GroupBy(r => (r.QuestionId, r.QuestionId is null ? r.QuizId : null))
                .Select(g =>
                {
                    var first = g.First();
                    var q = first.Question;
                    var z = q is null ? first.Quiz : null;
                    var authorId = q?.UserId ?? z?.UserId ?? Guid.Empty;
                    var open = g.Where(r => r.Status == ReportStatus.Open).ToList();
                    return new ReportTargetDTO
                    {
                        Lane = lane(g),
                        TargetType = q is not null ? "Question" : "Quiz",
                        QuestionId = q?.Id,
                        QuizId = q is null ? z?.Id : first.QuizId,
                        Title = q?.Text ?? z?.Title ?? "(deleted)",
                        MediaAssetId = q?.MediaAssetId ?? z?.CoverAssetId,
                        MediaUrl = q?.MediaUrl ?? z?.ImageUrl,
                        MediaType = q is not null ? q.MediaType.ToString() : (z?.ImageUrl is null ? "None" : "Image"),
                        MediaHidden = q?.MediaHiddenAt is not null,
                        QuizHeld = z?.ModerationHeldAt is not null,
                        QuizPicked = z?.IsPicked == true,
                        AuthorId = authorId,
                        Author = usernames.TryGetValue(authorId, out var name) ? name : "",
                        OpenCount = open.Count,
                        ReasonCounts = g.GroupBy(r => r.Reason.ToString()).ToDictionary(x => x.Key, x => x.Count()),
                        FirstReportedAt = g.Min(r => r.CreatedAt),
                        LastReportedAt = g.Max(r => r.CreatedAt),
                        Reports = g.OrderByDescending(r => r.CreatedAt).Take(20).Select(r => new ReportEntryDTO
                        {
                            Id = r.Id,
                            Reason = r.Reason.ToString(),
                            Details = r.Details,
                            CreatedAt = r.CreatedAt,
                            Status = r.Status.ToString(),
                            Outcome = r.Outcome?.ToString(),
                            ResolutionNote = r.ResolutionNote,
                            ResolvedAt = r.ResolvedAt,
                        }).ToList(),
                    };
                })
                // Most-reported first within a lane, then the oldest.
                .OrderByDescending(t => t.OpenCount).ThenBy(t => t.FirstReportedAt)
                .ToList();
        }
    }

    public interface IModerationService
    {
        Task<List<ReportTargetDTO>> ListLaneAsync(ReportLane lane, CancellationToken ct = default);
        Task<Dictionary<string, int>> LaneCountsAsync(CancellationToken ct = default);
        Task<int> ResolveAsync(Guid moderatorId, ResolveReportsCM cm, CancellationToken ct = default);
        Task SetMediaHiddenAsync(Guid moderatorId, int questionId, bool hidden, CancellationToken ct = default);
        Task SetQuizHeldAsync(Guid moderatorId, int quizId, bool held, CancellationToken ct = default);
        Task RemoveMediaAsync(Guid moderatorId, Guid assetId, CancellationToken ct = default);
        Task SetQuizPickedAsync(Guid moderatorId, int quizId, bool picked, CancellationToken ct = default);
    }

    /// <summary>
    /// The moderator's half of moderation: the lanes, and every action on the report page —
    /// uphold, reject, hide or show media, hold or release a quiz, remove a file, pick or unpick.
    /// Every action is audited. docs/media/moderation.md.
    /// </summary>
    public sealed class ModerationService(
        IModerationRepository repo,
        IMediaRepository media,
        IMediaStorage storage,
        INotificationService notifications,
        IAuditService audit,
        IOptions<ModerationOptions> options,
        TimeProvider clock,
        ILogger<ModerationService> logger) : IModerationService
    {
        private readonly ModerationOptions _o = options.Value;

        public async Task<List<ReportTargetDTO>> ListLaneAsync(ReportLane lane, CancellationToken ct = default)
        {
            var rows = await BuildAllAsync(lane == ReportLane.Resolved, ct);
            return rows.Where(r => r.Lane == lane.ToString()).ToList();
        }

        public async Task<Dictionary<string, int>> LaneCountsAsync(CancellationToken ct = default)
        {
            var rows = await BuildAllAsync(includeResolved: false, ct);
            return Enum.GetNames<ReportLane>().Where(n => n != nameof(ReportLane.Resolved))
                .ToDictionary(n => n, n => rows.Count(r => r.Lane == n));
        }

        private async Task<List<ReportTargetDTO>> BuildAllAsync(bool includeResolved, CancellationToken ct)
        {
            var open = await repo.ListOpenWithTargetsAsync(ct);
            var staffAuthors = new HashSet<Guid>();
            foreach (var author in open.Select(AuthorOf).Distinct())
                if (await repo.IsStaffAsync(author, ct)) staffAuthors.Add(author);

            var now = clock.GetUtcNow().UtcDateTime;
            string LaneOf(IGrouping<(int?, int?), ContentReport> g)
            {
                var first = g.First();
                if (g.Any(r => ContentReport.IsHarmful(r.Reason))
                    || first.Question?.MediaHiddenAt is not null
                    || (first.Question is null && first.Quiz?.ModerationHeldAt is not null))
                    return nameof(ReportLane.Urgent);
                if (g.Any(r => r.Reason != ReportReason.WrongAnswer)) return nameof(ReportLane.NeedsAttention);
                var stale = g.Count() >= _o.AuthorEscalationCount
                    || g.Min(r => r.CreatedAt) <= now.AddDays(-_o.AuthorWindowDays)
                    || staffAuthors.Contains(AuthorOf(first));
                return stale ? nameof(ReportLane.NeedsAttention) : nameof(ReportLane.WithAuthor);
            }

            var resolved = includeResolved ? await repo.ListRecentlyResolvedAsync(200, ct) : new List<ContentReport>();
            var names = await repo.GetUsernamesAsync(open.Concat(resolved).Select(AuthorOf), ct);
            return ReportTargets.Group(open, LaneOf, names, clock)
                .Concat(ReportTargets.Group(resolved, _ => nameof(ReportLane.Resolved), names, clock))
                .ToList();
        }

        private static Guid AuthorOf(ContentReport r) => r.Question?.UserId ?? r.Quiz?.UserId ?? Guid.Empty;

        public async Task<int> ResolveAsync(Guid moderatorId, ResolveReportsCM cm, CancellationToken ct = default)
        {
            if (!Enum.TryParse<ReportOutcome>(cm.Outcome, true, out var outcome)
                || outcome is not (ReportOutcome.Upheld or ReportOutcome.Rejected))
                throw new AppValidationException("Decide Upheld or Rejected.");
            var note = string.IsNullOrWhiteSpace(cm.Note) ? null : cm.Note.Trim();
            if (note is { Length: > ContentReport.MaxNoteLength })
                throw new AppValidationException($"Keep the note under {ContentReport.MaxNoteLength} characters.");

            var (question, quiz) = await LoadTargetAsync(cm.QuestionId, cm.QuizId, ct);
            var open = await repo.GetOpenReportsAsync(question?.Id, question is null ? quiz!.Id : null, ct);
            var now = clock.GetUtcNow().UtcDateTime;

            foreach (var r in open)
            {
                r.Status = ReportStatus.Resolved;
                r.Outcome = outcome;
                r.ResolutionNote = note;
                r.ResolvedById = moderatorId;
                r.ResolvedAt = now;
            }

            Guid? removeAsset = null;
            if (outcome == ReportOutcome.Rejected)
            {
                // Nothing was wrong: undo whatever the reports hid on their own.
                if (question is not null)
                {
                    question.MediaHiddenAt = null;
                    foreach (var z in await repo.GetQuizzesWithLiveQuestionAsync(question.Id, ct)) z.ModerationHeldAt = null;
                }
                else quiz!.ModerationHeldAt = null;
            }
            else
            {
                if (cm.RemoveMedia) removeAsset = question?.MediaAssetId ?? quiz?.CoverAssetId;
                if (cm.HoldQuiz)
                {
                    if (question is not null)
                        foreach (var z in await repo.GetQuizzesWithLiveQuestionAsync(question.Id, ct)) z.ModerationHeldAt ??= now;
                    else quiz!.ModerationHeldAt ??= now;
                }
                // An upheld harmful report against a picked quiz takes it out of the main pool.
                if (quiz is not null && open.Any(r => ContentReport.IsHarmful(r.Reason)))
                {
                    quiz.IsPicked = false;
                    quiz.PickedAt = null;
                }
            }

            await repo.SaveChangesAsync(ct);
            if (removeAsset is Guid assetId) await RemoveMediaAsync(moderatorId, assetId, ct);

            await audit.LogAsync($"moderation.reports.{outcome.ToString().ToLowerInvariant()}",
                question is not null ? "Question" : "Quiz", (question?.Id ?? quiz!.Id).ToString(),
                newValue: new { cm.RemoveMedia, cm.HoldQuiz, note, reports = open.Count }, userId: moderatorId, ct: ct);

            var title = ContentReportService.Shorten(question?.Text ?? quiz!.Title);
            var message = outcome == ReportOutcome.Upheld
                ? $"Thanks — your report on \"{title}\" led to a change."
                : $"We reviewed your report on \"{title}\" and left it as it is.";
            foreach (var reporter in open.Select(r => r.ReporterId).Distinct())
                await notifications.CreateAsync(reporter, "report", "Your report was reviewed", message, ct);
            return open.Count;
        }

        public async Task SetMediaHiddenAsync(Guid moderatorId, int questionId, bool hidden, CancellationToken ct = default)
        {
            var question = await repo.GetQuestionAsync(questionId, ct) ?? throw new NotFoundException("Question not found.");
            if (hidden && question.MediaAssetId is null) throw new AppValidationException("That question has no media.");
            question.MediaHiddenAt = hidden ? question.MediaHiddenAt ?? clock.GetUtcNow().UtcDateTime : null;
            await repo.SaveChangesAsync(ct);
            await audit.LogAsync(hidden ? "moderation.media.hide" : "moderation.media.show", "Question", questionId.ToString(), userId: moderatorId, ct: ct);
        }

        public async Task SetQuizHeldAsync(Guid moderatorId, int quizId, bool held, CancellationToken ct = default)
        {
            var quiz = await repo.GetQuizAsync(quizId, ct) ?? throw new NotFoundException("Quiz not found.");
            quiz.ModerationHeldAt = held ? quiz.ModerationHeldAt ?? clock.GetUtcNow().UtcDateTime : null;
            await repo.SaveChangesAsync(ct);
            await audit.LogAsync(held ? "moderation.quiz.hold" : "moderation.quiz.release", "Quiz", quizId.ToString(), userId: moderatorId, ct: ct);
        }

        /// <summary>
        /// Removes a file everywhere: every question and cover pointing at it loses it, the object is
        /// deleted from storage, and the row stays as a tombstone so the same bytes can't simply be
        /// uploaded again. Not undoable.
        /// </summary>
        public async Task RemoveMediaAsync(Guid moderatorId, Guid assetId, CancellationToken ct = default)
        {
            var asset = await media.GetAsync(assetId, ct) ?? throw new NotFoundException("File not found.");
            var now = clock.GetUtcNow().UtcDateTime;

            foreach (var q in await repo.GetQuestionsUsingAssetAsync(assetId, ct))
            {
                q.MediaAssetId = null;
                q.MediaUrl = null;
                q.MediaType = QuestionMediaType.None;
                q.MediaHiddenAt = null;
            }
            foreach (var z in await repo.GetQuizzesUsingAssetAsync(assetId, ct))
            {
                z.CoverAssetId = null;
                z.ImageUrl = null;
            }
            asset.RemovedAt ??= now;
            await repo.SaveChangesAsync(ct);

            foreach (var key in new[] { asset.StorageKey, asset.ThumbKey })
            {
                if (key is null) continue;
                try { await storage.DeleteAsync(key, ct); }
                catch (Exception ex) { logger.LogError(ex, "Removed media {AssetId} but could not delete object {Key}", assetId, key); }
            }
            await audit.LogAsync("moderation.media.remove", "MediaAsset", assetId.ToString(), userId: moderatorId, ct: ct);
        }

        public async Task SetQuizPickedAsync(Guid moderatorId, int quizId, bool picked, CancellationToken ct = default)
        {
            var quiz = await repo.GetQuizAsync(quizId, ct) ?? throw new NotFoundException("Quiz not found.");
            if (picked && quiz.Status != Models.Quiz.QuizStatus.Public)
                throw new AppValidationException("Only a Public quiz can be picked.");
            if (picked && quiz.ModerationHeldAt is not null)
                throw new AppValidationException("Release the hold before picking this quiz.");
            if (quiz.IsPicked == picked) return;

            quiz.IsPicked = picked;
            quiz.PickedAt = picked ? clock.GetUtcNow().UtcDateTime : null;
            await repo.SaveChangesAsync(ct);
            await audit.LogAsync(picked ? "quiz.pick" : "quiz.unpick", "Quiz", quizId.ToString(), userId: moderatorId, ct: ct);

            if (picked && !quiz.IsHouse)
                await notifications.CreateAsync(quiz.UserId, "success", "Your quiz was picked!",
                    $"\"{ContentReportService.Shorten(quiz.Title)}\" is now in the main catalogue, with a badge.", ct);
        }

        private async Task<(QuestionBase? Question, Models.Quiz.Quiz? Quiz)> LoadTargetAsync(int? questionId, int? quizId, CancellationToken ct)
        {
            if (questionId is int q)
                return (await repo.GetQuestionAsync(q, ct) ?? throw new NotFoundException("Question not found."), null);
            if (quizId is int z)
                return (null, await repo.GetQuizAsync(z, ct) ?? throw new NotFoundException("Quiz not found."));
            throw new AppValidationException("Say which question or quiz.");
        }
    }
}
