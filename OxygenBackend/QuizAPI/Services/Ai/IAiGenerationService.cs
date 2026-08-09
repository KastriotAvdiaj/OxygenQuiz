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
    }
}
