using Microsoft.Extensions.Options;

namespace QuizAPI.Services.Ai.Sources
{
    public enum GroundingStatus
    {
        /// <summary><c>Ai:Source:Enabled</c> is false. Generation runs exactly as before grounding existed.</summary>
        Off = 0,

        /// <summary>An article was found and goes into the prompt.</summary>
        Grounded = 1,

        /// <summary>The topic's language could not be told; the author picks English or Albanian.</summary>
        NeedsLanguage = 2,

        /// <summary>The search was not confident; the author picks one of <see cref="GroundingResult.Candidates"/>.</summary>
        NeedsArticle = 3,

        /// <summary>
        /// No usable source — too thin, not found, unreachable, or no source for the language. The
        /// generation runs from memory and says so; <see cref="GroundingResult.Reason"/> says why.
        /// </summary>
        Ungrounded = 4,
    }

    /// <summary>The article a grounded generation is written from.</summary>
    /// <param name="Provider">Which source tier, e.g. <c>wikipedia</c>.</param>
    /// <param name="Text">What the model reads, already cut to <see cref="SourceOptions.MaxSourceChars"/>.</param>
    /// <param name="Language">"English" or "Albanian" — the language the questions are written in.</param>
    public sealed record GroundedSource(string Provider, string Title, string? Url, string Text, string Language);

    public sealed record GroundingResult
    {
        public required GroundingStatus Status { get; init; }

        /// <summary>The language decided on, when one was — even for an ungrounded result.</summary>
        public string? Language { get; init; }

        public GroundedSource? Source { get; init; }

        /// <summary><see cref="GroundingStatus.NeedsArticle"/>: the articles to choose between.</summary>
        public IReadOnlyList<SourceCandidate> Candidates { get; init; } = Array.Empty<SourceCandidate>();

        /// <summary><see cref="GroundingStatus.NeedsLanguage"/>: the languages to choose between.</summary>
        public IReadOnlyList<string> Languages { get; init; } = Array.Empty<string>();

        /// <summary><see cref="GroundingStatus.Ungrounded"/>: a short machine-readable why.</summary>
        public string? Reason { get; init; }

        /// <summary>The article that was considered and rejected (thin), for the review to link to.</summary>
        public string? ConsideredTitle { get; init; }

        public bool NeedsChoice => Status is GroundingStatus.NeedsLanguage or GroundingStatus.NeedsArticle;

        public static readonly GroundingResult Off = new() { Status = GroundingStatus.Off };
    }

    /// <summary>What the author has already answered, when they come back after being asked.</summary>
    /// <param name="Language">The quiz's language: named by the author, or picked when asked.</param>
    /// <param name="ArticleTitle">The article picked from a <see cref="GroundingStatus.NeedsArticle"/> list.</param>
    /// <param name="Declined">
    /// "None of these": the author looked at the articles and none is right. The generation runs
    /// from memory — for topics Wikipedia has no good article for, the honest answer.
    /// </param>
    public sealed record GroundingAnswers(string? Language, string? ArticleTitle, bool Declined = false);

    public interface IQuizGrounding
    {
        Task<GroundingResult> GroundAsync(string topic, GroundingAnswers answers, CancellationToken ct);
    }

    /// <summary>
    /// Phase 2b's front half: which source a Topic-mode generation is written from, or what to ask
    /// the author first. Proposal and measurements:
    /// docs/proposals/topic-disambiguation-and-source-tiers.md; how it fits the request:
    /// docs/quiz/ai-quiz-generation-flow.md §2e.
    ///
    /// <para><b>Order.</b> Language first, because it decides which edition to search. The topic's
    /// own words (<see cref="TopicLanguage"/>), then — only when they are silent — whether exactly
    /// that title exists in one edition and not the other. Either way unsure: ask. Then the
    /// article, through the first source tier that serves the language; asking again when the
    /// search is not confident.</para>
    ///
    /// <para><b>Never fatal.</b> A source that is thin, missing or down makes the generation
    /// ungrounded, never failed — grounding improves generation, it is not a precondition for it.
    /// Asking is the only outcome that stops a generation, and it happens before any quota is
    /// reserved.</para>
    /// </summary>
    public sealed class QuizGrounding : IQuizGrounding
    {
        private readonly IReadOnlyList<IQuizSourceProvider> _providers;
        private readonly SourceOptions _options;

        public QuizGrounding(IEnumerable<IQuizSourceProvider> providers, IOptions<SourceOptions> options)
        {
            _providers = providers.ToList();
            _options = options.Value;
        }

        public async Task<GroundingResult> GroundAsync(string topic, GroundingAnswers answers, CancellationToken ct)
        {
            if (!_options.Enabled || string.IsNullOrWhiteSpace(topic)) return GroundingResult.Off;

            // ── Language. A language the author named is an instruction: one with no source means
            // no grounding, not a guess at another language (proposal §4d — no translating).
            if (!string.IsNullOrWhiteSpace(answers.Language) && Supported(answers.Language) is null)
                return Ungrounded(answers.Language.Trim(), "no-source-for-language");

            var language = Supported(answers.Language) ?? TopicLanguage.Guess(topic)
                           ?? await LanguageFromTitlesAsync(topic, ct);
            if (language is null)
                return new GroundingResult
                {
                    Status = GroundingStatus.NeedsLanguage,
                    Languages = SourceLanguageDetector.Supported,
                };

            if (answers.Declined) return Ungrounded(language, "declined");

            // ── Source.
            var provider = _providers.FirstOrDefault(p => p.SupportsLanguage(language));
            if (provider is null)
                return Ungrounded(language, "no-source-for-language");

            var lookup = string.IsNullOrWhiteSpace(answers.ArticleTitle)
                ? await provider.LookupAsync(topic, language, ct)
                : await provider.FetchAsync(answers.ArticleTitle, language, ct);

            return lookup.Outcome switch
            {
                SourceOutcome.Selected => new GroundingResult
                {
                    Status = GroundingStatus.Grounded,
                    Language = language,
                    Source = new GroundedSource(provider.Name, lookup.Title!, lookup.Url, lookup.Text!, language),
                },
                SourceOutcome.NeedsDisambiguation => new GroundingResult
                {
                    Status = GroundingStatus.NeedsArticle,
                    Language = language,
                    Candidates = lookup.Candidates,
                },
                SourceOutcome.TooThin => Ungrounded(language, "too-thin") with { ConsideredTitle = lookup.Title },
                SourceOutcome.Unavailable => Ungrounded(language, "unavailable"),
                _ => Ungrounded(language, "not-found"),
            };
        }

        /// <summary>
        /// The tiebreak for topics whose words carry no signal ("Chemistry", "Futbolli"): the
        /// language whose edition — and only whose edition — has exactly that title. Both or
        /// neither is no answer: "Python" is a real article on both, and that is precisely the
        /// topic that should be asked about.
        /// </summary>
        private async Task<string?> LanguageFromTitlesAsync(string topic, CancellationToken ct)
        {
            var found = new List<string>();
            foreach (var language in SourceLanguageDetector.Supported)
            {
                var provider = _providers.FirstOrDefault(p => p.SupportsLanguage(language));
                if (provider is not null && await provider.HasTitleAsync(topic, language, ct))
                    found.Add(language);
            }
            return found.Count == 1 ? found[0] : null;
        }

        private static string? Supported(string? language) =>
            SourceLanguageDetector.Supported.FirstOrDefault(
                l => string.Equals(l, language?.Trim(), StringComparison.OrdinalIgnoreCase));

        private static GroundingResult Ungrounded(string language, string reason) =>
            new() { Status = GroundingStatus.Ungrounded, Language = language, Reason = reason };
    }
}
