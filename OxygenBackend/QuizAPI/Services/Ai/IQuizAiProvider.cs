namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// A hosted LLM that turns a prompt into a JSON string. Deliberately knows nothing about
    /// quizzes, quotas, users, or HTTP requests from our own clients — that keeps swapping
    /// DeepSeek for Gemini or Claude to a single new class plus a config change, and makes the
    /// whole orchestration testable against a fake.
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
        Task<AiProviderResult> CompleteJsonAsync(string prompt, CancellationToken ct);
    }

    /// <param name="Content">The model's raw reply text.</param>
    /// <param name="Usage">Token counts for cost accounting. Zero if the provider omits them.</param>
    public sealed record AiProviderResult(string Content, AiTokenUsage Usage);
}
