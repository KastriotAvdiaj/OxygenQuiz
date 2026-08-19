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

        Task<AiQuotaStatus> GetQuotaStatusAsync(Guid userId, CancellationToken ct = default);

        /// <summary>
        /// Whether generation is being offered at all right now — the kill switch and the spend
        /// caps, but nothing about the caller. False here means every <see cref="GenerateAsync"/>
        /// call would come back <c>FeatureDisabled</c>, so the UI should stop offering the button
        /// rather than let someone press it into a 503.
        /// </summary>
        Task<bool> IsAvailableAsync(CancellationToken ct = default);
    }
}
