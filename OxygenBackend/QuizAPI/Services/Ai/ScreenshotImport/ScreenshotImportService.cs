using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Models.Ai;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Media;

namespace QuizAPI.Services.Ai.ScreenshotImport
{
    public interface IScreenshotImportService
    {
        Task<ScreenshotImportStatus> GetStatusAsync(Guid userId, bool unlimited, CancellationToken ct);

        /// <summary>Reads one image's questions. Writes no question — the reviewer saves.</summary>
        Task<ScreenshotReadResult> ReadAsync(
            Guid userId, bool unlimited, byte[] image, ScreenshotMakeType makeType, CancellationToken ct);
    }

    /// <summary>
    /// Screenshot import (docs/quiz/screenshot-import.md): a model reads the questions on an image,
    /// a second call fills in what the image didn't show, and the code decides what survives
    /// (<see href="../../../../docs/adr/0003-the-model-proposes-the-code-decides.md">ADR 0003</see>).
    /// The image is shrunk, stripped of metadata, sent, and dropped — never stored.
    /// </summary>
    public sealed class ScreenshotImportService : IScreenshotImportService
    {
        /// <summary>One import's images, sent one request each; the client stops at this many.</summary>
        public const int MaxImagesPerImport = 10;

        private readonly IQuizAiProvider _provider;
        private readonly IAiGenerationUsageRepository _usages;
        private readonly IQuestionRepository _questions;
        private readonly IQuestionCategoryRepository _categories;
        private readonly IQuestionDifficultyRepository _difficulties;
        private readonly IQuestionLanguageRepository _languages;
        private readonly AiOptions _ai;
        private readonly MediaOptions _media;
        private readonly ILogger<ScreenshotImportService> _logger;

        public ScreenshotImportService(
            IQuizAiProvider provider,
            IAiGenerationUsageRepository usages,
            IQuestionRepository questions,
            IQuestionCategoryRepository categories,
            IQuestionDifficultyRepository difficulties,
            IQuestionLanguageRepository languages,
            IOptions<AiOptions> ai,
            IOptions<MediaOptions> media,
            ILogger<ScreenshotImportService> logger)
        {
            _provider = provider;
            _usages = usages;
            _questions = questions;
            _categories = categories;
            _difficulties = difficulties;
            _languages = languages;
            _ai = ai.Value;
            _media = media.Value;
            _logger = logger;
        }

        private ScreenshotImportOptions O => _ai.ScreenshotImport;

        /// <summary>Why it's off, in words for the admin; null when it's on.</summary>
        private string? OffReason =>
            !_ai.Enabled ? "AI is switched off on this site."
            : !_ai.ImagesEnabled ? "The selected AI model can't read images."
            : !O.Enabled ? "Screenshot import isn't switched on yet."
            : null;

        public async Task<ScreenshotImportStatus> GetStatusAsync(Guid userId, bool unlimited, CancellationToken ct)
        {
            var reason = OffReason;
            return new ScreenshotImportStatus(
                reason is null, reason, await ImagesLeftAsync(userId, unlimited, ct), MaxImagesPerImport);
        }

        public async Task<ScreenshotReadResult> ReadAsync(
            Guid userId, bool unlimited, byte[] image, ScreenshotMakeType makeType, CancellationToken ct)
        {
            if (OffReason is { } reason) throw new AppValidationException(reason);

            var left = await ImagesLeftAsync(userId, unlimited, ct);
            if (left is <= 0)
                throw new QuotaExceededException(
                    $"You've read {O.DailyImagesPerAdmin} images today, the daily allowance. Try again tomorrow.");

            await GuardBudgetAsync(ct);

            // The upload pipeline's own checks — format sniffed from the bytes, the header read
            // before a pixel is decoded (the decompression-bomb defence), one frame — then shrunk to
            // what the model reads. Only the re-encoded WebP leaves this method; nothing is stored.
            var processed = MediaProcessor.ProcessImage(image, _media, O.MaxEdge);

            var categories = await _categories.GetAllAsync(ct);
            var difficulties = await _difficulties.GetAllAsync(ct);
            var languages = await _languages.GetAllAsync(ct);

            var usage = new AiTokenUsage(0, 0);
            List<SeenQuestion> seen;
            try
            {
                var read = await _provider.CompleteJsonAsync(
                    ScreenshotImportPrompts.BuildRead(
                        Named(categories.Select(c => c.Name)),
                        Named(difficulties.Select(d => d.Level)),
                        Named(languages.Select(l => l.Language)),
                        O.MaxQuestionsPerImage),
                    O.ReadMaxOutputTokens,
                    new AiCallOptions(new AiImage(processed.Main, "image/webp"), O.ReadReasoningEffort),
                    ct);
                usage = Add(usage, read.Usage);
                seen = ParseRead(read.Content).Take(O.MaxQuestionsPerImage).ToList();
            }
            catch (AiProviderException ex)
            {
                await RecordAsync(userId, usage, 0, AiErrorCodes.ProviderUnavailable, ct);
                _logger.LogWarning(ex, "Screenshot read failed upstream.");
                // A refused key fails every image the same way, so "try again" would be a lie.
                // Staff-only feature: naming the setting is fine here, unlike in player-facing text.
                if (ex.UpstreamStatus is 401 or 403)
                    throw new ServiceUnavailableException(
                        "The AI service refused this site's API key, so no image can be read. Check Ai:ApiKey — trying again won't help.");
                throw new ServiceUnavailableException("The image couldn't be read right now. Try this one again.");
            }
            catch (ScreenshotReplyException ex)
            {
                await RecordAsync(userId, usage, 0, AiErrorCodes.ModelOutputInvalid, ct);
                _logger.LogWarning("Screenshot read reply rejected: {Reason}", ex.Message);
                throw new ServiceUnavailableException("The reply about this image wasn't usable. Try it again.");
            }

            // Nothing on it: costs the reader nothing from the allowance (a released row still
            // counts towards the spending caps — the money was spent).
            if (seen.Count == 0)
            {
                await RecordAsync(userId, usage, 0, errorCode: "NoQuestions", ct);
                return new ScreenshotReadResult(Array.Empty<ScreenshotQuestionDTO>(), left);
            }

            var completions = new Dictionary<int, Completion>();
            var toComplete = seen
                .Select((q, i) => (Q: q, Index: i))
                .Where(x => !x.Q.NeedsItsPicture && NeedsCompletion(x.Q))
                .ToList();
            if (toComplete.Count > 0)
            {
                try
                {
                    var complete = await _provider.CompleteJsonAsync(
                        ScreenshotImportPrompts.BuildComplete(toComplete
                            .Select(x => (x.Index, x.Q.Text, x.Q.SeenType.ToString(), (IReadOnlyList<string>)x.Q.ShownOptions, x.Q.ShownAnswer))
                            .ToList()),
                        O.CompleteMaxOutputTokens,
                        ct);
                    usage = Add(usage, complete.Usage);
                    completions = ParseComplete(complete.Content);
                }
                catch (Exception ex) when (ex is AiProviderException or ScreenshotReplyException)
                {
                    // The read still stands: rows without an answer are dropped below, the rest
                    // are offered. Worse than complete, better than losing the image.
                    _logger.LogWarning(ex, "Screenshot completion failed; offering what was read.");
                }
            }

            var result = new List<ScreenshotQuestionDTO>();
            for (var i = 0; i < seen.Count; i++)
            {
                var built = Build(seen[i], completions.GetValueOrDefault(i), makeType, categories, difficulties, languages);
                if (built is null) continue;
                result.Add(built);
            }

            result = await FlagDuplicatesAsync(result, ct);

            await RecordAsync(userId, usage, result.Count, errorCode: null, ct);
            return new ScreenshotReadResult(result, left is null ? null : left - 1);
        }

        // ── Allowance and budget ──────────────────────────────────────────────────────

        private async Task<int?> ImagesLeftAsync(Guid userId, bool unlimited, CancellationToken ct)
        {
            if (unlimited) return null;
            var used = await _usages.CountSucceededSinceAsync(
                userId, AiGenerationMode.ScreenshotImport, DateTime.UtcNow.Date, ct);
            return Math.Max(0, O.DailyImagesPerAdmin - used);
        }

        private async Task GuardBudgetAsync(CancellationToken ct)
        {
            if (_ai.DailyBudgetUsd > 0
                && await _usages.SumEstimatedCostSinceAsync(DateTime.UtcNow.AddDays(-1), ct) >= _ai.DailyBudgetUsd)
                throw new QuotaExceededException("Today's AI budget is spent. Try again tomorrow.");
            if (_ai.MonthlyBudgetUsd > 0
                && await _usages.SumEstimatedCostSinceAsync(DateTime.UtcNow.AddDays(-30), ct) >= _ai.MonthlyBudgetUsd)
                throw new QuotaExceededException("This month's AI budget is spent.");
        }

        /// <summary>
        /// One ledger row per image: Succeeded counts against the allowance, anything else is
        /// released. Either way it carries the cost, so the spending caps see every call.
        /// </summary>
        private async Task RecordAsync(Guid userId, AiTokenUsage usage, int returned, string? errorCode, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            await _usages.AddAsync(new AiGenerationUsage
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Status = errorCode is null ? AiGenerationStatus.Succeeded : AiGenerationStatus.Released,
                Mode = AiGenerationMode.ScreenshotImport,
                Model = _provider.Model,
                InputTokens = usage.InputTokens,
                OutputTokens = usage.OutputTokens,
                QuestionsReturned = returned,
                EstimatedCostUsd =
                    usage.InputTokens / 1_000_000m * _ai.InputCostPerMillionUsd +
                    usage.OutputTokens / 1_000_000m * _ai.OutputCostPerMillionUsd,
                ErrorCode = errorCode,
                CreatedAt = now,
                CompletedAt = now,
            }, ct);
            await _usages.SaveChangesAsync(ct);
        }

        private static AiTokenUsage Add(AiTokenUsage a, AiTokenUsage b) =>
            new(a.InputTokens + b.InputTokens, a.OutputTokens + b.OutputTokens);

        /// <summary>The lookups the model may name — never the seeded "Unspecified".</summary>
        private static List<string> Named(IEnumerable<string?> names) =>
            names.Where(n => !string.IsNullOrWhiteSpace(n) && !IsUnspecified(n))
                .Select(n => n!.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

        private static bool IsUnspecified(string? name) =>
            string.Equals(name?.Trim(), "Unspecified", StringComparison.OrdinalIgnoreCase);

        // ── Reading the replies — strict about shape, forgiving about one bad question ─────

        internal sealed record SeenQuestion(
            string Text, QuestionType SeenType, List<string> ShownOptions, string? ShownAnswer,
            bool NeedsItsPicture, string? ImageQuery, string? Category, string? Difficulty, string? Language);

        internal sealed record Completion(
            string? CorrectAnswer, List<string> WrongOptions, List<string> AcceptableAnswers, string? Explanation);

        internal static List<SeenQuestion> ParseRead(string content)
        {
            using var doc = ParseObject(content);
            if (!doc.RootElement.TryGetProperty("questions", out var arr) || arr.ValueKind != JsonValueKind.Array)
                throw new ScreenshotReplyException("no \"questions\" array");

            var list = new List<SeenQuestion>();
            foreach (var q in arr.EnumerateArray())
            {
                if (q.ValueKind != JsonValueKind.Object) continue;
                var text = Str(q, "text");
                if (string.IsNullOrWhiteSpace(text)) continue;
                if (!Enum.TryParse<QuestionType>(Str(q, "seenType"), true, out var seenType)
                    || !Enum.IsDefined(seenType))
                    seenType = QuestionType.TypeTheAnswer;

                list.Add(new SeenQuestion(
                    text.Trim(),
                    seenType,
                    Strings(q, "shownOptions"),
                    Blank(Str(q, "shownAnswer")),
                    q.TryGetProperty("needsItsPicture", out var np) && np.ValueKind == JsonValueKind.True,
                    CleanImageQuery(Str(q, "imageQuery")),
                    Blank(Str(q, "category")),
                    Blank(Str(q, "difficulty")),
                    Blank(Str(q, "language"))));
            }
            return list;
        }

        internal static Dictionary<int, Completion> ParseComplete(string content)
        {
            using var doc = ParseObject(content);
            if (!doc.RootElement.TryGetProperty("answers", out var arr) || arr.ValueKind != JsonValueKind.Array)
                throw new ScreenshotReplyException("no \"answers\" array");

            var map = new Dictionary<int, Completion>();
            foreach (var a in arr.EnumerateArray())
            {
                if (a.ValueKind != JsonValueKind.Object
                    || !a.TryGetProperty("index", out var idx) || !idx.TryGetInt32(out var i)) continue;
                map[i] = new Completion(
                    Blank(Str(a, "correctAnswer")),
                    Strings(a, "wrongOptions"),
                    Strings(a, "acceptableAnswers"),
                    Blank(Str(a, "explanation")));
            }
            return map;
        }

        private static JsonDocument ParseObject(string content)
        {
            var start = content.IndexOf('{');
            var end = content.LastIndexOf('}');
            if (start < 0 || end <= start) throw new ScreenshotReplyException("no JSON object in the reply");
            try
            {
                return JsonDocument.Parse(content[start..(end + 1)]);
            }
            catch (JsonException ex)
            {
                throw new ScreenshotReplyException("unparseable JSON: " + ex.Message);
            }
        }

        private static string? Str(JsonElement o, string name) =>
            o.TryGetProperty(name, out var v) ? v.ValueKind switch
            {
                JsonValueKind.String => v.GetString(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Number => v.GetRawText(),
                _ => null,
            } : null;

        private static List<string> Strings(JsonElement o, string name) =>
            o.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Array
                ? v.EnumerateArray()
                    .Where(e => e.ValueKind == JsonValueKind.String)
                    .Select(e => e.GetString()!.Trim())
                    .Where(s => s.Length > 0)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList()
                : new List<string>();

        private static string? Blank(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

        /// <summary>Text to search for, never a link — the rule the AI wizard's image hook keeps too.</summary>
        internal static string? CleanImageQuery(string? q)
        {
            q = Blank(q);
            if (q is null || q.Length < 2 || q.Length > 80) return null;
            if (q.Contains("://") || q.StartsWith("www.", StringComparison.OrdinalIgnoreCase)) return null;
            return q;
        }

        // ── Deciding what survives ─────────────────────────────────────────────────────

        private static bool NeedsCompletion(SeenQuestion q) =>
            q.ShownAnswer is null
            || (q.SeenType != QuestionType.TrueFalse && WrongShown(q).Count < 3)
            || q.SeenType == QuestionType.TypeTheAnswer;

        private static List<string> WrongShown(SeenQuestion q) =>
            q.ShownOptions.Where(o => !SameText(o, q.ShownAnswer)).ToList();

        internal static ScreenshotQuestionDTO? Build(
            SeenQuestion q, Completion? c, ScreenshotMakeType makeType,
            IReadOnlyList<DTOs.Question.QuestionCategoryDTO> categories,
            IReadOnlyList<DTOs.Question.QuestionDifficultyDTO> difficulties,
            IReadOnlyList<DTOs.Question.QuestionLanguageDTO> languages)
        {
            var categoryId = MatchId(q.Category, categories.Select(x => (x.Id, (string?)x.Name)));
            var difficultyId = MatchId(q.Difficulty, difficulties.Select(x => (x.ID, (string?)x.Level)));
            var languageId = MatchId(q.Language, languages.Select(x => (x.ID, (string?)x.Language)));

            // Shown as a greyed-out row, so the reviewer sees what was skipped (proposal, Q31).
            if (q.NeedsItsPicture)
                return new ScreenshotQuestionDTO
                {
                    Type = q.SeenType, SeenType = q.SeenType, Text = q.Text, NeedsItsPicture = true,
                    ImageQuery = q.ImageQuery, CategoryId = categoryId, DifficultyId = difficultyId, LanguageId = languageId,
                };

            var answerFromImage = q.ShownAnswer is not null;
            var answer = q.ShownAnswer ?? c?.CorrectAnswer;
            if (answer is null) return null; // nothing to grade against — not a question we can offer

            if (q.SeenType == QuestionType.TrueFalse)
            {
                var b = answer.Trim().ToLowerInvariant();
                if (b is not ("true" or "false")) return null;
                return new ScreenshotQuestionDTO
                {
                    Type = QuestionType.TrueFalse, SeenType = QuestionType.TrueFalse, Text = q.Text,
                    CorrectAnswer = b, AnswerFromImage = answerFromImage, OptionsFromImage = true,
                    Explanation = c?.Explanation, ImageQuery = q.ImageQuery,
                    CategoryId = categoryId, DifficultyId = difficultyId, LanguageId = languageId,
                };
            }

            // Shown wrong options first, then the model's, never the answer twice.
            var wrong = WrongShown(q)
                .Concat(c?.WrongOptions ?? new List<string>())
                .Where(o => !SameText(o, answer))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(3)
                .ToList();
            var optionsFromImage = WrongShown(q).Count >= 3;

            var type = makeType switch
            {
                ScreenshotMakeType.MultipleChoice => QuestionType.MultipleChoice,
                ScreenshotMakeType.TypeTheAnswer => QuestionType.TypeTheAnswer,
                _ => q.SeenType,
            };
            // Multiple choice needs at least one wrong option to be a choice at all.
            if (type == QuestionType.MultipleChoice && wrong.Count == 0) type = QuestionType.TypeTheAnswer;

            return new ScreenshotQuestionDTO
            {
                Type = type, SeenType = q.SeenType, Text = q.Text, CorrectAnswer = answer,
                WrongOptions = wrong,
                AcceptableAnswers = (c?.AcceptableAnswers ?? new List<string>())
                    .Where(a => !SameText(a, answer)).Take(10).ToList(),
                Explanation = c?.Explanation, AnswerFromImage = answerFromImage, OptionsFromImage = optionsFromImage,
                ImageQuery = q.ImageQuery, CategoryId = categoryId, DifficultyId = difficultyId, LanguageId = languageId,
            };
        }

        private static int? MatchId(string? name, IEnumerable<(int Id, string? Name)> rows) =>
            name is null || IsUnspecified(name)
                ? null
                : rows.Where(r => SameText(r.Name, name)).Select(r => (int?)r.Id).FirstOrDefault();

        private static bool SameText(string? a, string? b) =>
            string.Equals(Normalize(a), Normalize(b), StringComparison.OrdinalIgnoreCase);

        internal static string Normalize(string? s) =>
            string.Join(' ', (s ?? string.Empty).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
                .Trim().TrimEnd('?', '.', '!', ':').ToLowerInvariant();

        /// <summary>
        /// Same wording as a question already in the bank → *Possible duplicate*. Flagged, never
        /// blocked: the same words can be a different language's question, or have other options.
        /// </summary>
        private async Task<List<ScreenshotQuestionDTO>> FlagDuplicatesAsync(
            List<ScreenshotQuestionDTO> rows, CancellationToken ct)
        {
            var candidates = rows.Where(r => !r.NeedsItsPicture).Select(r => r.Text.ToLower()).Distinct().ToList();
            if (candidates.Count == 0) return rows;

            var existing = await _questions.Query()
                .Where(q => candidates.Contains(q.Text.ToLower()))
                .Select(q => new { q.Id, q.Text })
                .ToListAsync(ct);

            return rows.Select(r =>
            {
                var match = existing.FirstOrDefault(e => SameText(e.Text, r.Text));
                return match is null ? r : Copy(r, match.Id);
            }).ToList();
        }

        private static ScreenshotQuestionDTO Copy(ScreenshotQuestionDTO r, int duplicateOf) => new()
        {
            Type = r.Type, SeenType = r.SeenType, Text = r.Text, CorrectAnswer = r.CorrectAnswer,
            WrongOptions = r.WrongOptions, AcceptableAnswers = r.AcceptableAnswers, Explanation = r.Explanation,
            AnswerFromImage = r.AnswerFromImage, OptionsFromImage = r.OptionsFromImage,
            NeedsItsPicture = r.NeedsItsPicture, ImageQuery = r.ImageQuery, CategoryId = r.CategoryId,
            DifficultyId = r.DifficultyId, LanguageId = r.LanguageId, DuplicateOfId = duplicateOf,
        };
    }

    internal sealed class ScreenshotReplyException(string message) : Exception(message);
}
