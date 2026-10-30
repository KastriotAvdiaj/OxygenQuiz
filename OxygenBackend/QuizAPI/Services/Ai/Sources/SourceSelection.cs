namespace QuizAPI.Services.Ai.Sources
{
    public enum SourceDecisionKind
    {
        /// <summary>Use this article.</summary>
        Use = 0,
        /// <summary>Do not guess — put the candidates to the author.</summary>
        Ask = 1,
        /// <summary>The only matching articles are too short to ground anything.</summary>
        TooThin = 2,
        /// <summary>Nothing usable came back, or nothing that shares a word with the topic.</summary>
        NotFound = 3,
    }

    /// <param name="TermIsAmbiguous">Asking because the top hit is a disambiguation page — the source says the term has several meanings.</param>
    public sealed record SourceDecision(
        SourceDecisionKind Kind,
        SourceCandidate? Chosen,
        IReadOnlyList<SourceCandidate> Candidates,
        bool TermIsAmbiguous = false);

    /// <summary>
    /// Which article a set of search hits points at, or whether to ask.
    ///
    /// <para>Pure on purpose: no HTTP, no cache, no clock. The rules below are the part worth
    /// testing, and keeping them away from the network is what makes that cheap.</para>
    ///
    /// <para><b>The rule (2026-10-29).</b> Disambiguation pages and stubs under the minimum length
    /// are never sources. Among the rest, the article whose title best matches the topic
    /// (<see cref="TitleMatch"/>: most shared words, then the most precise title, then search rank)
    /// is used only when the match is clear — it shares at least two of the topic's words (all of
    /// them for a one-word topic), covers at least half of them, and at least three-quarters of its
    /// own title's words come from the topic. A weaker best match is a question for the author, and
    /// no shared word at all is "not found".</para>
    ///
    /// <para><b>What it replaced.</b> The first version used search rank plus a "much longer
    /// runner-up" ratio, fitted to nine title-like queries. Run on the twelve eval topics — which
    /// are phrases, as real topics are — it asked on seven, called a 28-word book stub the best
    /// Albanian-cuisine article, and silently picked the snake for "Bazat e programimit në Python".
    /// This rule, on the same twelve plus 29 shorter topics, uses the expected article on 31,
    /// asks on 10 — including every topic Wikipedia has no good article for — and picks no wrong
    /// article. That is fitting, not validation; the eval is what tests it.</para>
    /// </summary>
    public static class SourceSelection
    {
        public const double MinCoverage = 0.5;
        public const double MinPrecision = 0.75;

        public static SourceDecision Decide(
            string topic,
            IReadOnlyList<SourceCandidate> candidates,
            int minWords,
            int maxCandidatesToOffer)
        {
            if (candidates is null || candidates.Count == 0)
                return new SourceDecision(SourceDecisionKind.NotFound, null, Array.Empty<SourceCandidate>());

            var articles = candidates.Where(c => !c.IsDisambiguation).ToList();
            var usable = articles.Where(c => c.Words >= minWords).ToList();

            // Best match first; search rank breaks ties, so it still counts for something.
            var ranked = usable
                .Select((c, rank) => (Candidate: c, Score: Best(topic, c), Rank: rank))
                .OrderByDescending(x => x.Score.Overlap)
                .ThenByDescending(x => x.Score.Precision)
                .ThenBy(x => x.Rank)
                .ToList();
            var offer = ranked.Select(x => x.Candidate).Take(Math.Max(2, maxCandidatesToOffer)).ToList();

            // The source itself says the term is ambiguous. Nothing to weigh — ask.
            if (candidates[0].IsDisambiguation)
                return offer.Count > 0
                    ? new SourceDecision(SourceDecisionKind.Ask, null, offer, TermIsAmbiguous: true)
                    : new SourceDecision(SourceDecisionKind.NotFound, null, Array.Empty<SourceCandidate>());

            if (ranked.Count == 0)
            {
                // Only stubs. Say which one was nearest, so the review can name what it passed over.
                var nearest = articles
                    .OrderByDescending(c => Best(topic, c).Overlap)
                    .FirstOrDefault(c => Best(topic, c).Overlap > 0);
                return nearest is null
                    ? new SourceDecision(SourceDecisionKind.NotFound, null, Array.Empty<SourceCandidate>())
                    : new SourceDecision(SourceDecisionKind.TooThin, nearest, Array.Empty<SourceCandidate>());
            }

            var best = ranked[0];
            if (best.Score.Overlap == 0)
                return new SourceDecision(SourceDecisionKind.NotFound, null, Array.Empty<SourceCandidate>());

            var clear = best.Score.Overlap >= TitleMatch.RequiredOverlap(topic)
                        && best.Score.Coverage >= MinCoverage
                        && best.Score.Precision >= MinPrecision;

            return clear
                ? new SourceDecision(SourceDecisionKind.Use, best.Candidate, Array.Empty<SourceCandidate>())
                : new SourceDecision(SourceDecisionKind.Ask, null, offer);
        }

        /// <summary>
        /// The better of the title and the redirect the search matched through. "Quantum physics"
        /// finds <i>Quantum mechanics</i> by its redirect, and the redirect is what matches.
        /// </summary>
        internal static TitleScore Best(string topic, SourceCandidate c)
        {
            var title = TitleMatch.Score(topic, c.Title);
            if (string.IsNullOrWhiteSpace(c.RedirectTitle)) return title;
            var redirect = TitleMatch.Score(topic, c.RedirectTitle);
            return (redirect.Overlap, redirect.Precision).CompareTo((title.Overlap, title.Precision)) > 0 ? redirect : title;
        }
    }
}
