namespace QuizAPI.Services.Ai.Sources
{
    /// <summary>
    /// Finds material for a grounded generation. One implementation per source tier
    /// (docs/proposals/topic-disambiguation-and-source-tiers.md §4d); the tiers are consulted in
    /// order until one returns <see cref="SourceOutcome.Selected"/>.
    ///
    /// <para>Knows nothing about prompts, quotas or quizzes — same reason
    /// <see cref="IQuizAiProvider"/> doesn't: it keeps adding a tier to a config change and a
    /// class, and keeps the orchestration testable against a fake.</para>
    ///
    /// <para>Implementations never throw for an unreachable source. A source that is down is an
    /// ordinary outcome (<see cref="SourceOutcome.Unavailable"/>) and the generation continues
    /// ungrounded — grounding is an improvement to generation, never a precondition for it.</para>
    /// </summary>
    public interface IQuizSourceProvider
    {
        /// <summary>Name for logs and for the review UI, e.g. <c>wikipedia</c>.</summary>
        string Name { get; }

        /// <summary>
        /// Whether this provider can serve the given quiz language at all. Checked before
        /// <see cref="LookupAsync"/> so an unsupported language costs no request.
        /// </summary>
        bool SupportsLanguage(string? languageName);

        Task<SourceLookup> LookupAsync(string topic, string? languageName, CancellationToken ct);
    }
}
