namespace QuizAPI.Services.Ai.Sources
{
    public enum SourceDecisionKind
    {
        /// <summary>Use this article.</summary>
        Use = 0,
        /// <summary>Do not guess — put the candidates to the author.</summary>
        Ask = 1,
        /// <summary>One article, and it is too short to ground anything.</summary>
        TooThin = 2,
        /// <summary>Nothing usable came back.</summary>
        NotFound = 3,
    }

    public sealed record SourceDecision(
        SourceDecisionKind Kind,
        SourceCandidate? Chosen,
        IReadOnlyList<SourceCandidate> Candidates);

    /// <summary>
    /// Which article a set of search hits points at, or whether to ask.
    ///
    /// <para>Pure on purpose: no HTTP, no cache, no clock. The rules below are the part that is
    /// worth testing, and keeping them away from the network is what makes that cheap.</para>
    ///
    /// <para><b>Why not simply take the first hit.</b> Measured against the MediaWiki search API on
    /// 2026-10-28, the first hit is the wrong article in three of five English cases: "Human
    /// respiratory system" returns <i>Human body</i> ahead of <i>Respiratory system</i>, and
    /// "Balkans campaign World War II" returns the World War I front. Taking the longest hit is
    /// worse — it chooses the wrong war <i>and</i> Freddie Mercury over the planet.</para>
    ///
    /// <para><b>The close-contest rule.</b> When a lower-ranked article is much longer than the top
    /// hit, the search is not confident, and the cost of being wrong is ten grounded-looking wrong
    /// questions. Asking is cheap; a silent wrong pick is not. The ratio was fitted to nine
    /// observed cases and matches the human judgement on all nine — which is fitting, not
    /// validation. The eval harness is what tests whether it generalises.</para>
    /// </summary>
    public static class SourceSelection
    {
        public static SourceDecision Decide(
            IReadOnlyList<SourceCandidate> candidates,
            int minWords,
            double closeContestRatio,
            int maxCandidatesToOffer)
        {
            if (candidates is null || candidates.Count == 0)
                return new SourceDecision(SourceDecisionKind.NotFound, null, Array.Empty<SourceCandidate>());

            // Disambiguation pages are never a source — they are a list of links. They can still be
            // the signal that a choice is needed, which is why they are filtered out here rather
            // than earlier.
            var articles = candidates.Where(c => !c.IsDisambiguation).ToList();
            if (articles.Count == 0)
                return new SourceDecision(SourceDecisionKind.NotFound, null, Array.Empty<SourceCandidate>());

            var offer = articles.Take(Math.Max(2, maxCandidatesToOffer)).ToList();

            // The top hit is an explicit disambiguation page: the source itself is telling us the
            // term is ambiguous. Nothing to weigh.
            if (candidates[0].IsDisambiguation)
                return new SourceDecision(SourceDecisionKind.Ask, null, offer);

            // Close contest: a lower-ranked article is substantially longer than the top hit.
            if (articles.Count > 1 && articles[1].Words >= articles[0].Words * closeContestRatio)
                return new SourceDecision(SourceDecisionKind.Ask, null, offer);

            var chosen = articles[0];

            // Thinness is checked last, so an ambiguous-and-thin topic is still put to the author:
            // one of the candidates they are offered may be long enough.
            if (chosen.Words < minWords)
                return new SourceDecision(SourceDecisionKind.TooThin, chosen, Array.Empty<SourceCandidate>());

            return new SourceDecision(SourceDecisionKind.Use, chosen, Array.Empty<SourceCandidate>());
        }
    }
}
