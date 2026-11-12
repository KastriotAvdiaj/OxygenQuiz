using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using QuizAPI.Models.Ai;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.CurrentUserService;

namespace QuizAPI.Services.Ai.Sources
{
    public enum TopicKind
    {
        /// <summary>One subject, one article — the grounding that existed before broad topics.</summary>
        Single = 0,

        /// <summary>A selection across many subjects ("General knowledge"): read several articles.</summary>
        Broad = 1,
    }

    /// <param name="Subtopics">For <see cref="TopicKind.Broad"/>: article titles the model proposed.
    /// Proposals only — <see cref="QuizGrounding"/> looks each one up and drops what it can't find.</param>
    public sealed record TopicPlan(TopicKind Kind, IReadOnlyList<string> Subtopics)
    {
        public static readonly TopicPlan Single = new(TopicKind.Single, Array.Empty<string>());
    }

    /// <summary>
    /// Says whether a topic is one subject or a selection across many, and for the second kind
    /// which subjects to read (docs/quiz/ai-quiz-generation-flow.md §2f, ADR 0045).
    /// </summary>
    public interface ITopicPlanner
    {
        /// <summary>
        /// Null when there is no plan to act on — planning is off, the budget is spent, nobody is
        /// signed in, or the model's reply was unusable. Null always means "treat it as one
        /// subject", which is what happened before this existed.
        /// </summary>
        Task<TopicPlan?> PlanAsync(string topic, string language, CancellationToken ct);
    }

    /// <summary>
    /// One small model call in front of grounding.
    ///
    /// <para><b>Why a model at all.</b> Grounding picked an article by matching the topic's words
    /// against titles (<see cref="SourceSelection"/>), which assumes the topic <i>is</i> a subject.
    /// "General Knowledge" matches the article <i>General knowledge</i> perfectly and produced a
    /// quiz about the concept; "History's most significant events" matches nothing and asked the
    /// author to pick a page. Whether a phrase names a subject or asks for a selection is a
    /// question about meaning, and no rule over titles answers it.</para>
    ///
    /// <para><b>The model proposes, the code decides</b> (ADR 0003). The reply is a list of names
    /// and nothing more: each is looked up like any topic and must be a clear title match to be
    /// read, so an invented or misspelt title is dropped, not trusted. The earlier proposal
    /// rejected asking a model whether a topic is <i>ambiguous</i>
    /// (topic-disambiguation-and-source-tiers.md §5); that stands — "Mercury" is still settled by
    /// Wikipedia's own disambiguation page, and this is never asked to choose between meanings.</para>
    ///
    /// <para><b>The ledger.</b> The call spends money before any quota slot is reserved, so it
    /// writes its own <see cref="AiGenerationMode.TopicPlan"/> row — the budget caps see it, and it
    /// takes no slot. A plan is cached, so answering grounding's question and coming back, or
    /// trying the same topic twice, plans once.</para>
    /// </summary>
    public sealed class TopicPlanner : ITopicPlanner
    {
        /// <summary>In the prompt so <see cref="FakeQuizAiProvider"/> can tell this call from a quiz.</summary>
        public const string Marker = "You sort quiz topics.";

        private readonly IQuizAiProvider _provider;
        private readonly IAiGenerationUsageRepository _usages;
        private readonly IAiQuotaService _quota;
        private readonly ICurrentUserService _currentUser;
        private readonly IMemoryCache _cache;
        private readonly AiOptions _ai;
        private readonly BroadTopicOptions _options;
        private readonly ILogger<TopicPlanner> _logger;

        public TopicPlanner(
            IQuizAiProvider provider,
            IAiGenerationUsageRepository usages,
            IAiQuotaService quota,
            ICurrentUserService currentUser,
            IMemoryCache cache,
            IOptions<AiOptions> ai,
            IOptions<SourceOptions> source,
            ILogger<TopicPlanner> logger)
        {
            _provider = provider;
            _usages = usages;
            _quota = quota;
            _currentUser = currentUser;
            _cache = cache;
            _ai = ai.Value;
            _options = source.Value.Broad;
            _logger = logger;
        }

        public async Task<TopicPlan?> PlanAsync(string topic, string language, CancellationToken ct)
        {
            if (!_options.Enabled || !_ai.Enabled || string.IsNullOrWhiteSpace(topic)) return null;

            var key = $"topic-plan:{language}:{topic.Trim().ToLowerInvariant()}";
            if (_cache.TryGetValue(key, out TopicPlan? cached) && cached is not null) return cached;

            // The row needs an owner, and an anonymous caller has no business spending on a model.
            if (_currentUser.UserId is not { } userId) return null;

            // Someone with no generation left today can't use a plan, so don't buy one: otherwise
            // every new topic typed after the last slot is a small unmetered call.
            var status = await _quota.GetStatusAsync(userId, ct);
            if (status.Remaining is <= 0) return null;
            if (await _quota.IsOverBudgetAsync(ct)) return null;

            AiProviderResult reply;
            try
            {
                var prompt = BuildPrompt(topic, language, _options.SubtopicsToAsk);
                reply = string.IsNullOrWhiteSpace(_options.PlanReasoningEffort)
                    ? await _provider.CompleteJsonAsync(prompt, _options.PlanMaxOutputTokens, ct)
                    : await _provider.CompleteJsonAsync(
                        prompt, _options.PlanMaxOutputTokens,
                        new AiCallOptions(ReasoningEffort: _options.PlanReasoningEffort.Trim()), ct);
            }
            catch (AiProviderException ex)
            {
                // Never fatal: no plan means the topic is grounded as one subject, as before.
                _logger.LogWarning("Topic planning failed upstream ({Code}); treating the topic as one subject.", ex.ErrorCode);
                return null;
            }

            var plan = Parse(reply.Content, _options.SubtopicsToAsk);
            await RecordAsync(userId, reply.Usage, plan is null ? AiErrorCodes.ModelOutputInvalid : null, ct);

            if (plan is null)
            {
                _logger.LogWarning("Topic planning reply was unusable; treating the topic as one subject.");
                return null;
            }

            _cache.Set(key, plan, TimeSpan.FromMinutes(_options.PlanCacheMinutes));
            return plan;
        }

        /// <summary>
        /// Names only, as everywhere else: the model is told the language and the count and nothing
        /// about our data. The examples are the two shapes that failed (see the class summary).
        /// </summary>
        internal static string BuildPrompt(string topic, string language, int count) =>
            $$""""
            {{Marker}} An author typed a TOPIC for a quiz. Decide whether ONE encyclopedia article can carry the whole quiz.

            Reply with a single json object and NOTHING else:
            { "kind": "single" | "broad", "subtopics": [string] }

            "single": the topic names ONE subject that has its own Wikipedia article — a person, a place, an event, a work, an organism, a concept, a technology, or one well-defined field. Examples: "Photosynthesis", "World War II", "The human respiratory system", "C# programming language", "Skanderbeg". For "single", "subtopics" is [].

            "broad": the topic asks for a selection ACROSS many separate subjects, so no one article answers it. Examples: "General knowledge", "History's most significant events", "Famous scientists", "World capitals", "90s music", "Science trivia". An article ABOUT the phrase itself (the article "General knowledge") is not what the author wants.

            For "broad", list exactly {{count}} subtopics:
            - each is the exact title of a well-known {{language}} Wikipedia article about one concrete subject — a thing, never a list, a category or a field ("French Revolution", not "List of revolutions" or "European history");
            - together they cover the topic fairly and with variety; for general knowledge spread them over different fields (science, history, geography, arts, nature, technology, sport);
            - pick subjects with long, established articles and lasting facts — nothing about current events, living office-holders or records that change;
            - write every title in {{language}}, spelt as that edition of Wikipedia spells it;
            - no duplicates, and no two that overlap heavily.

            If in doubt, answer "single".

            TOPIC:
            """
            {{topic.Trim()}}
            """
            """";

        /// <summary>
        /// Lenient about wrapping (a fenced or chatty reply still holds one object), strict about
        /// content: an unknown kind is no plan, and a "broad" with fewer than two usable names is
        /// no plan either — one article is what "single" already does.
        /// </summary>
        internal static TopicPlan? Parse(string? content, int max)
        {
            if (string.IsNullOrWhiteSpace(content)) return null;
            var start = content.IndexOf('{');
            var end = content.LastIndexOf('}');
            if (start < 0 || end <= start) return null;

            try
            {
                using var doc = JsonDocument.Parse(content[start..(end + 1)]);
                var root = doc.RootElement;
                if (root.ValueKind != JsonValueKind.Object
                    || !root.TryGetProperty("kind", out var kind) || kind.ValueKind != JsonValueKind.String)
                    return null;

                var value = kind.GetString()!.Trim();
                if (string.Equals(value, "single", StringComparison.OrdinalIgnoreCase)) return TopicPlan.Single;
                if (!string.Equals(value, "broad", StringComparison.OrdinalIgnoreCase)) return null;

                if (!root.TryGetProperty("subtopics", out var list) || list.ValueKind != JsonValueKind.Array)
                    return null;

                var names = list.EnumerateArray()
                    .Where(e => e.ValueKind == JsonValueKind.String)
                    .Select(e => e.GetString()!.Trim())
                    // A title, not a sentence: anything longer is the model explaining itself.
                    .Where(n => n.Length is > 0 and <= MaxSubtopicLength)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Take(Math.Max(2, max))
                    .ToList();

                return names.Count >= 2 ? new TopicPlan(TopicKind.Broad, names) : null;
            }
            catch (JsonException)
            {
                return null;
            }
        }

        internal const int MaxSubtopicLength = 120;

        /// <summary>
        /// One ledger row per planning call, like a palette proposal: the cost is counted by the
        /// spending caps and no quiz slot is taken (the slot count reads Topic and Source rows only).
        /// </summary>
        private async Task RecordAsync(Guid userId, AiTokenUsage usage, string? errorCode, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            await _usages.AddAsync(new AiGenerationUsage
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Status = errorCode is null ? AiGenerationStatus.Succeeded : AiGenerationStatus.Released,
                Mode = AiGenerationMode.TopicPlan,
                Model = _provider.Model,
                InputTokens = usage.InputTokens,
                OutputTokens = usage.OutputTokens,
                EstimatedCostUsd =
                    usage.InputTokens / 1_000_000m * _ai.InputCostPerMillionUsd +
                    usage.OutputTokens / 1_000_000m * _ai.OutputCostPerMillionUsd,
                ErrorCode = errorCode,
                CreatedAt = now,
                CompletedAt = now,
            }, ct);
            await _usages.SaveChangesAsync(ct);
        }
    }
}
