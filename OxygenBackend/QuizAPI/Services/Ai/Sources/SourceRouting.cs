namespace QuizAPI.Services.Ai.Sources
{
    /// <summary>One source's answer for a topic, before the router combines them.</summary>
    public sealed record SourceAnswer(string Provider, SourceLookup Lookup);

    /// <summary>What the router concluded across every source that serves the language.</summary>
    /// <param name="Provider">The source of <see cref="Lookup"/> when it is a single page (selected or too thin).</param>
    /// <param name="Unreachable">Sources that could not be reached, whatever else happened — for the outage notice.</param>
    public sealed record RoutedLookup(string? Provider, SourceLookup Lookup, IReadOnlyList<string> Unreachable);

    /// <summary>
    /// Which of several sources a topic is written from (docs/quiz/ai-quiz-generation-flow.md §2e,
    /// "More than one source").
    ///
    /// <para><b>Every source is searched, and the titles decide.</b> The proposal's first plan was
    /// a fixed order by category — Wikipedia for history, Microsoft Learn for programming — but the
    /// category isn't known when the topic is typed, and guessing it is the kind of judgement this
    /// work keeps out of the model's hands. Each source already decides on its own whether it has a
    /// clear match (<see cref="SourceSelection"/>), and that rule is strict, so a clear match is
    /// worth trusting wherever it came from: "Azure Functions" finds nothing clear on Wikipedia and
    /// <i>What is Azure Functions?</i> on Learn; "Photosynthesis" is the reverse.</para>
    ///
    /// <para>The order of the rules below:</para>
    /// <list type="number">
    ///   <item><b>A disambiguation page asks</b>, even if another source was sure. Wikipedia saying
    ///     "Azure" means several things outweighs Learn having a page called <i>What is Azure?</i>;
    ///     the colour is a fair reading of that topic.</item>
    ///   <item><b>One clear match is used.</b> Two are compared by title, and a tie asks.</item>
    ///   <item><b>Otherwise, everything offered is offered together</b>, best title match first.</item>
    ///   <item>Then too thin, then unreachable, then not found.</item>
    /// </list>
    /// Pure, like <see cref="SourceSelection"/>, so the rules are tested without a network.
    /// </summary>
    public static class SourceRouting
    {
        public static RoutedLookup Combine(string topic, IReadOnlyList<SourceAnswer> answers, int maxCandidatesToOffer)
        {
            var unreachable = answers
                .Where(a => a.Lookup.Outcome == SourceOutcome.Unavailable)
                .Select(a => a.Provider)
                .ToList();
            var selected = answers.Where(a => a.Lookup.Outcome == SourceOutcome.Selected).ToList();
            var asks = answers.Where(a => a.Lookup.Outcome == SourceOutcome.NeedsDisambiguation).ToList();
            var offer = Math.Max(2, maxCandidatesToOffer);

            if (asks.Any(a => a.Lookup.TermIsAmbiguous))
            {
                var all = selected.Select(AsCandidate).Concat(Merge(topic, asks)).Take(offer).ToList();
                return new RoutedLookup(null, SourceLookup.NeedsDisambiguation(all), unreachable);
            }

            if (selected.Count == 1)
                return new RoutedLookup(selected[0].Provider, selected[0].Lookup, unreachable);

            if (selected.Count > 1)
            {
                var ranked = selected
                    .Select(a => (Answer: a, Score: TitleMatch.Score(topic, a.Lookup.Title ?? string.Empty)))
                    .OrderByDescending(x => x.Score.Overlap)
                    .ThenByDescending(x => x.Score.Precision)
                    .ToList();
                var (best, second) = (ranked[0].Score, ranked[1].Score);
                if (best.Overlap > second.Overlap || (best.Overlap == second.Overlap && best.Precision > second.Precision))
                    return new RoutedLookup(ranked[0].Answer.Provider, ranked[0].Answer.Lookup, unreachable);

                var tied = ranked.Select(x => AsCandidate(x.Answer)).Take(offer).ToList();
                return new RoutedLookup(null, SourceLookup.NeedsDisambiguation(tied), unreachable);
            }

            if (asks.Count > 0)
                return new RoutedLookup(null, SourceLookup.NeedsDisambiguation(Merge(topic, asks).Take(offer).ToList()), unreachable);

            var thin = answers.FirstOrDefault(a => a.Lookup.Outcome == SourceOutcome.TooThin);
            if (thin is not null) return new RoutedLookup(thin.Provider, thin.Lookup, unreachable);

            return unreachable.Count > 0
                ? new RoutedLookup(null, SourceLookup.Unavailable, unreachable)
                : new RoutedLookup(null, SourceLookup.NotFound, unreachable);
        }

        /// <summary>
        /// Every source's candidates in one list: best title match first, then each source's own
        /// order, alternating — so one source's long list can't push the other's best off the end.
        /// </summary>
        private static IEnumerable<SourceCandidate> Merge(string topic, IEnumerable<SourceAnswer> asks) =>
            asks
                .SelectMany(a => a.Lookup.Candidates.Select((c, rank) =>
                    (Candidate: c.Provider == a.Provider ? c : c with { Provider = a.Provider }, Rank: rank)))
                .Select(x => (x.Candidate, x.Rank, Score: TitleMatch.Score(topic, x.Candidate.Title)))
                .OrderByDescending(x => x.Score.Overlap)
                .ThenByDescending(x => x.Score.Precision)
                .ThenBy(x => x.Rank)
                .Select(x => x.Candidate);

        private static SourceCandidate AsCandidate(SourceAnswer a) =>
            new(a.Lookup.Title!, a.Lookup.Words) { Url = a.Lookup.Url, Provider = a.Provider, Key = a.Lookup.Key };
    }
}
