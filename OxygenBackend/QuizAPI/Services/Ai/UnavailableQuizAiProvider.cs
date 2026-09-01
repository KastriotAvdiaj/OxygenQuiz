namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// Registered in place of a real provider when the AI configuration cannot produce a working
    /// call. Every caller is supposed to check <see cref="AiOptions.Enabled"/> first — which
    /// <see cref="AiConfigurationResolver"/> has already forced to false in this situation — so
    /// reaching this class means a gate is missing somewhere.
    ///
    /// <para>It exists because the alternative is worse. Leaving
    /// <see cref="OpenAiCompatibleQuizAiProvider"/> registered against a blank BaseUrl throws
    /// <c>UriFormatException</c> from inside the HTTP client factory — a 500 with a stack trace
    /// about URI parsing, which reads as a bug rather than as configuration. Failing here instead
    /// produces the same <see cref="AiProviderException"/> the rest of the pipeline already knows
    /// how to turn into "unavailable, copy the prompt into your own AI".</para>
    /// </summary>
    public sealed class UnavailableQuizAiProvider : IQuizAiProvider
    {
        private readonly ILogger<UnavailableQuizAiProvider> _logger;

        public UnavailableQuizAiProvider(ILogger<UnavailableQuizAiProvider> logger) => _logger = logger;

        /// <summary>No model wrote anything, and saying otherwise would put a lie in the ledger.</summary>
        public string Model => "unavailable";

        public Task<AiProviderResult> CompleteJsonAsync(
            string prompt, int? maxOutputTokens, CancellationToken ct)
        {
            _logger.LogError(
                "An AI call reached the provider while the AI configuration is invalid. Ai:Enabled " +
                "should have stopped this earlier — a caller is missing its availability gate.");

            throw new AiProviderException(
                AiErrorCodes.FeatureDisabled,
                "The AI service is not configured on this server.");
        }
    }
}
