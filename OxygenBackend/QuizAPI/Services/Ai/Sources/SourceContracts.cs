namespace QuizAPI.Services.Ai.Sources
{
    /// <summary>
    /// What a source lookup concluded. Every value except <see cref="Selected"/> means the
    /// generation does <b>not</b> get to claim it is grounded.
    /// </summary>
    public enum SourceOutcome
    {
        /// <summary>One article was chosen confidently and is long enough to carry the questions.</summary>
        Selected = 0,

        /// <summary>
        /// The search was not confident. <see cref="SourceLookup.Candidates"/> holds what it found,
        /// and a human picks — see docs/proposals/topic-disambiguation-and-source-tiers.md §4a.
        /// </summary>
        NeedsDisambiguation = 1,

        /// <summary>
        /// An article was found and is too short to support the request. Deliberately distinct from
        /// <see cref="NotFound"/>: a stub is <i>worse</i> than nothing, because it is enough to make
        /// the pipeline look grounded and not enough to carry the questions, so the model fills the
        /// gap from memory while the UI shows a citation.
        /// </summary>
        TooThin = 2,

        /// <summary>The search returned nothing usable.</summary>
        NotFound = 3,

        /// <summary>The source could not be reached. Never a user-facing error — fall back ungrounded.</summary>
        Unavailable = 4,
    }

    /// <param name="Title">The article title, as the source spells it.</param>
    /// <param name="Words">Length in words, used by the thinness gate and the close-contest rule.</param>
    public sealed record SourceCandidate(string Title, int Words)
    {
        /// <summary>
        /// Set from MediaWiki's <c>pageprops.disambiguation</c>, not from the title. A page called
        /// plain "Mercury" carries the marker while its title says nothing, so a title-based check
        /// misses exactly the case this exists for.
        /// </summary>
        public bool IsDisambiguation { get; init; }

        public string? Url { get; init; }
    }

    /// <summary>The result of looking a topic up in one source.</summary>
    public sealed record SourceLookup
    {
        public required SourceOutcome Outcome { get; init; }

        /// <summary>The chosen article, when one was chosen.</summary>
        public string? Title { get; init; }

        /// <summary>Canonical URL of the chosen article. Carries the CC BY-SA attribution.</summary>
        public string? Url { get; init; }

        /// <summary>Plain-text extract, already truncated to the configured ceiling.</summary>
        public string? Text { get; init; }

        public int Words { get; init; }

        /// <summary>Populated for <see cref="SourceOutcome.NeedsDisambiguation"/>.</summary>
        public IReadOnlyList<SourceCandidate> Candidates { get; init; } = Array.Empty<SourceCandidate>();

        public static SourceLookup Selected(string title, string? url, string text, int words) =>
            new() { Outcome = SourceOutcome.Selected, Title = title, Url = url, Text = text, Words = words };

        public static SourceLookup NeedsDisambiguation(IReadOnlyList<SourceCandidate> candidates) =>
            new() { Outcome = SourceOutcome.NeedsDisambiguation, Candidates = candidates };

        public static SourceLookup TooThin(string title, string? url, int words) =>
            new() { Outcome = SourceOutcome.TooThin, Title = title, Url = url, Words = words };

        public static readonly SourceLookup NotFound = new() { Outcome = SourceOutcome.NotFound };
        public static readonly SourceLookup Unavailable = new() { Outcome = SourceOutcome.Unavailable };
    }
}
