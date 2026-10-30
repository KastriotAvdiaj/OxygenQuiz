namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// Orchestrates one generation: gate → reserve → prompt → provider → extract → commit.
    /// The order matters and is documented in docs/quiz/ai-quiz-generation-flow.md §3.
    /// </summary>
    public interface IAiGenerationService
    {
        Task<AiGenerationOutcome> GenerateAsync(Guid userId, AiGenerationRequest request, CancellationToken ct = default);

        /// <summary>
        /// The prompt that <see cref="GenerateAsync"/> would send, without sending it. Backs
        /// copy-paste mode so both paths share one prompt (plan §5.1). Free: no quota, no provider.
        /// </summary>
        string BuildPrompt(AiGenerationRequest request);

        /// <summary>
        /// The prompt, grounded when <see cref="AiGenerationRequest.Ground"/> asks for it. Prompt is
        /// null when grounding needs the author to choose first — the result says what to ask.
        /// </summary>
        Task<(string? Prompt, Sources.GroundingResult Grounding)> BuildPromptAsync(
            AiGenerationRequest request, CancellationToken ct = default);

        Task<AiQuotaStatus> GetQuotaStatusAsync(Guid userId, CancellationToken ct = default);

        /// <summary>
        /// The model id currently configured, e.g. <c>deepseek-v4-flash</c>. Surfaced so the
        /// wizard can name what generated a quiz, and so support questions ("why is it worse
        /// today?") can be answered without shell access to the server's config.
        ///
        /// <para>Read from the provider rather than <c>Ai:Model</c> so it stays honest for the
        /// fake provider too, which reports <c>fake-provider</c> — a wizard claiming
        /// <c>deepseek-v4-flash</c> while a stub answers would be worse than saying nothing.</para>
        /// </summary>
        string ModelId { get; }

        /// <summary>
        /// Whether generation is being offered at all right now — the kill switch and the spend
        /// caps, but nothing about the caller. False here means every <see cref="GenerateAsync"/>
        /// call would come back <c>FeatureDisabled</c>, so the UI should stop offering the button
        /// rather than let someone press it into a 503.
        /// </summary>
        Task<bool> IsAvailableAsync(CancellationToken ct = default);

        /// <summary>
        /// <see cref="IsAvailableAsync"/>, and the configured model is allowed to write from a
        /// user's own material (<c>AiVendorOptions.AllowsSourceMode</c>). False means a Source-mode
        /// generation or an upload would be refused, so the UI shows the option as not yet available.
        /// </summary>
        Task<bool> IsSourceModeAvailableAsync(CancellationToken ct = default);
    }
}
