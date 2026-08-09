namespace QuizAPI.Services.Ai
{
    /// <summary>How the user asked for the quiz. Recorded on every usage row.</summary>
    public enum AiGenerationMode
    {
        /// <summary>Generated from a subject line alone — the model recalls the facts (plan §8).</summary>
        Topic = 0,

        /// <summary>Generated from user-supplied material (pasted text today; files in 2.3).</summary>
        Source = 1
    }

    /// <summary>Lifecycle of a quota reservation. See docs/quiz/ai-quiz-generation-flow.md §4.</summary>
    public enum AiGenerationStatus
    {
        /// <summary>Slot taken, generation in flight. Counts against the daily quota.</summary>
        Reserved = 0,

        /// <summary>Model replied with usable JSON. Counts against the daily quota.</summary>
        Succeeded = 1,

        /// <summary>
        /// Kept for rows we want to keep counting despite an imperfect result. Currently unused —
        /// every failure path releases instead. Present so the enum doesn't need a migration the
        /// first time we decide some failure *should* cost a slot.
        /// </summary>
        Failed = 2,

        /// <summary>Generation failed before the user got anything. Does NOT count against quota.</summary>
        Released = 3
    }

    /// <summary>
    /// The closed set of machine-readable failure codes. The frontend switches on these, so
    /// adding one is an API change: update docs/quiz/ai-quiz-generation-plan.md §6.2, the
    /// controller's status mapping, and the client's error copy together.
    /// </summary>
    public static class AiErrorCodes
    {
        public const string FeatureDisabled = "FeatureDisabled";
        public const string QuotaExceeded = "QuotaExceeded";
        public const string EmailNotVerified = "EmailNotVerified";

        /// <summary>
        /// The request is malformed — unknown mode, no question types, no difficulty names, no
        /// language. Distinct from <see cref="EmptySource"/>, which is about the *material*:
        /// the two need different copy, and the client should mostly never see either because
        /// it validates first.
        /// </summary>
        public const string InvalidRequest = "InvalidRequest";

        /// <summary>The user gave the model nothing to work from — no topic, or too little source text.</summary>
        public const string EmptySource = "EmptySource";
        public const string SourceTooLarge = "SourceTooLarge";
        public const string UnreadableSource = "UnreadableSource";
        public const string ProviderUnavailable = "ProviderUnavailable";
        public const string ProviderTimeout = "ProviderTimeout";
        public const string ModelOutputInvalid = "ModelOutputInvalid";
    }

    /// <summary>
    /// What the caller asked for. Carries entity <b>names</b> only — never ids. The prompt has
    /// no business knowing our primary keys, and the browser resolves names back to ids using
    /// the machinery that already exists (docs/quiz/ai-quiz-creation-plan.md §2b).
    /// </summary>
    public sealed record AiGenerationRequest
    {
        public AiGenerationMode Mode { get; init; }

        /// <summary>Topic mode: the subject to write about.</summary>
        public string? Topic { get; init; }

        /// <summary>Source mode: the material to write from.</summary>
        public string? SourceText { get; init; }

        /// <summary>
        /// The language the user explicitly picked, if they picked one. When null or blank the
        /// model chooses from <see cref="LanguageNames"/> — normally the language the topic was
        /// typed in — and reports its choice back for a human to confirm.
        /// </summary>
        public string? LanguageName { get; init; }

        /// <summary>
        /// Language names that exist in the DB, so the model can only ever name one we already
        /// have. An unmatched value is discarded, never created.
        /// </summary>
        public IReadOnlyList<string> LanguageNames { get; init; } = Array.Empty<string>();

        /// <summary>
        /// Category names that exist in the DB. When non-empty the model is asked to pick the
        /// closest fit and the human confirms it in the review step — same strict-resolve,
        /// never-create rule as difficulties.
        /// </summary>
        public IReadOnlyList<string> CategoryNames { get; init; } = Array.Empty<string>();

        /// <summary>Difficulty names that exist in the DB. The model must pick from these.</summary>
        public IReadOnlyList<string> DifficultyNames { get; init; } = Array.Empty<string>();

        public int QuestionCount { get; init; }

        /// <summary>"MultipleChoice" | "TrueFalse" | "TypeTheAnswer". At least one.</summary>
        public IReadOnlyList<string> AllowedTypes { get; init; } = Array.Empty<string>();

        public string? ExtraInstructions { get; init; }
    }

    /// <summary>Token counts as reported by the provider, for cost accounting.</summary>
    public sealed record AiTokenUsage(int InputTokens, int OutputTokens)
    {
        public static readonly AiTokenUsage Zero = new(0, 0);
    }

    /// <summary>
    /// The result of a generation attempt.
    ///
    /// Expected failures (quota, provider down, unusable model output) are values, not
    /// exceptions: they are ordinary outcomes of a request that worked, and modelling them as
    /// data keeps the 2.2 switch to a streamed terminal frame a pure serialisation change.
    /// Exceptions remain for genuine bugs.
    /// </summary>
    public sealed record AiGenerationOutcome
    {
        public bool Success { get; init; }

        /// <summary>
        /// On success: the model's JSON object as a string, shape <c>{ "questions": [...] }</c>.
        /// Deliberately NOT deserialised here — semantic validation belongs to the browser's
        /// parse-ai-output.ts, which already owns it (plan §5.2).
        /// </summary>
        public string? PayloadJson { get; init; }

        /// <summary>One of <see cref="AiErrorCodes"/> when <see cref="Success"/> is false.</summary>
        public string? ErrorCode { get; init; }

        /// <summary>User-facing message. Safe to display; never contains provider internals.</summary>
        public string? Message { get; init; }

        /// <summary>When the user may try again — set for quota exhaustion.</summary>
        public DateTime? RetryAfterUtc { get; init; }

        public AiTokenUsage Usage { get; init; } = AiTokenUsage.Zero;

        /// <summary>Remaining generations today, after this one. Null when not applicable.</summary>
        public int? QuotaRemaining { get; init; }

        // ── Quiz-level suggestions ──
        // Returned as separate fields rather than left inside PayloadJson so the browser's
        // parse-ai-output.ts keeps its existing contract: it still receives an object whose only
        // interesting key is "questions", and stays untouched. The wizard reads these three off
        // the response and resolves the two names against the entity lists it already has
        // loaded — the same names-not-ids resolution difficulties have always used.

        /// <summary>A title for the quiz. Free text, so nothing to resolve. Null if absent.</summary>
        public string? SuggestedTitle { get; init; }

        /// <summary>
        /// A category NAME, already checked to be one we sent. Null when the model didn't pick,
        /// picked something that doesn't exist, or wasn't asked.
        /// </summary>
        public string? SuggestedCategory { get; init; }

        /// <summary>A language NAME, checked the same way.</summary>
        public string? SuggestedLanguage { get; init; }

        public static AiGenerationOutcome Ok(
            string payloadJson,
            AiTokenUsage usage,
            int quotaRemaining,
            string? suggestedTitle = null,
            string? suggestedCategory = null,
            string? suggestedLanguage = null) =>
            new()
            {
                Success = true,
                PayloadJson = payloadJson,
                Usage = usage,
                QuotaRemaining = quotaRemaining,
                SuggestedTitle = suggestedTitle,
                SuggestedCategory = suggestedCategory,
                SuggestedLanguage = suggestedLanguage,
            };

        public static AiGenerationOutcome Fail(string code, string message, DateTime? retryAfterUtc = null) =>
            new() { Success = false, ErrorCode = code, Message = message, RetryAfterUtc = retryAfterUtc };
    }

    /// <summary>
    /// Thrown by an <see cref="IQuizAiProvider"/> when the upstream call fails in a way the
    /// orchestrator should turn into a user-facing code rather than a 500.
    /// </summary>
    public sealed class AiProviderException : Exception
    {
        public AiProviderException(string errorCode, string message, Exception? inner = null)
            : base(message, inner) => ErrorCode = errorCode;

        /// <summary>One of <see cref="AiErrorCodes"/>.</summary>
        public string ErrorCode { get; }
    }
}
