namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// A hosted LLM that turns a prompt into a JSON string. Deliberately knows nothing about
    /// quizzes, quotas, users, or HTTP requests from our own clients — that keeps swapping one
    /// vendor for another to a config change (or, for a vendor that doesn't speak the OpenAI
    /// ChatCompletions format, a single new class), and makes the whole orchestration testable
    /// against a fake.
    ///
    /// Implementations throw <see cref="AiProviderException"/> for upstream failures the
    /// orchestrator should surface as a user-facing code. Anything else escaping is a bug.
    /// </summary>
    public interface IQuizAiProvider
    {
        /// <summary>Model id, recorded on the usage row so a provider switch is visible in the data.</summary>
        string Model { get; }

        /// <summary>
        /// Sends <paramref name="prompt"/> and returns the raw reply. The reply is NOT parsed or
        /// trusted here: the caller extracts JSON from it, and the browser validates it.
        /// </summary>
        /// <param name="maxOutputTokens">
        /// Per-call ceiling, or null for <c>Ai:MaxOutputTokens</c>. Exists because the global
        /// value is sized for a 15-question quiz (8000) and every caller was paying for that
        /// headroom — vendors reserve <c>max_tokens</c> up front. A palette proposal is a few
        /// dozen tokens, and asking for 8000 of room to return them is how an admin-only,
        /// unmetered feature quietly competes with quiz generation for the same budget.
        /// </param>
        Task<AiProviderResult> CompleteJsonAsync(
            string prompt, int? maxOutputTokens, CancellationToken ct);
    }

    /// <param name="Content">The model's raw reply text.</param>
    /// <param name="Usage">Token counts for cost accounting. Zero if the provider omits them.</param>
    public sealed record AiProviderResult(string Content, AiTokenUsage Usage);
}
