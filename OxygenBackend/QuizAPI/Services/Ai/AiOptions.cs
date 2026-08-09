namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// Configuration for in-app AI quiz generation, bound from the <c>"Ai"</c> section.
    /// See docs/quiz/ai-quiz-generation-plan.md §14.
    ///
    /// <para><b>The API key never appears in appsettings.json.</b> Supply it out-of-band:
    /// <c>Ai__ApiKey</c> as an environment variable, or user-secrets in development. Program.cs
    /// refuses to start when <see cref="Enabled"/> is true and the key is blank — same
    /// fail-fast convention as the external auth providers.</para>
    /// </summary>
    public sealed class AiOptions
    {
        public const string SectionName = "Ai";

        /// <summary>
        /// Master kill switch. False → the generate endpoint returns
        /// <see cref="AiErrorCodes.FeatureDisabled"/> and the UI falls back to copy-paste.
        /// This is the lever to pull during a provider outage or a budget emergency.
        /// </summary>
        public bool Enabled { get; set; }

        /// <summary>
        /// <c>"DeepSeek"</c> or <c>"Fake"</c>. The fake provider returns canned questions with no
        /// network call and no cost, so the whole feature — quota, budget, audit, error mapping,
        /// the browser parser, the review builder — can be exercised before an API key exists.
        /// Program.cs refuses <c>"Fake"</c> in Production.
        /// </summary>
        public string Provider { get; set; } = "DeepSeek";

        public string BaseUrl { get; set; } = "https://api.deepseek.com";

        /// <summary>
        /// Model id. NOTE: <c>deepseek-chat</c> / <c>deepseek-reasoner</c> were retired 2026-07-24
        /// in favour of the V4 names. Re-check against api-docs.deepseek.com before changing.
        /// </summary>
        public string Model { get; set; } = "deepseek-v4-flash";

        public string ApiKey { get; set; } = string.Empty;

        /// <summary>Low on purpose — we want recall and obedience, not creativity (plan §8).</summary>
        public double Temperature { get; set; } = 0.3;

        public int TimeoutSeconds { get; set; } = 90;

        // ── Quota and spend ──

        /// <summary>Generations per user per UTC day, for users without an override.</summary>
        public int DefaultDailyQuota { get; set; } = 5;

        /// <summary>
        /// Rolling 30-day spend ceiling. Once exceeded the feature behaves as disabled until
        /// spend ages out. Zero or negative disables the check.
        /// </summary>
        public decimal MonthlyBudgetUsd { get; set; } = 25m;

        /// <summary>
        /// Rolling 24-hour spend ceiling. The monthly cap bounds total loss; this one bounds how
        /// fast it can happen. Without it, a bug that generates in a loop burns the entire
        /// monthly budget in an afternoon and takes the feature down for 30 days — with it, the
        /// same bug costs a day and self-heals. Zero or negative disables the check.
        /// </summary>
        public decimal DailyBudgetUsd { get; set; } = 2m;

        /// <summary>
        /// Hard ceiling on output tokens per call, passed to the provider as <c>max_tokens</c>.
        ///
        /// This is the one that matters for a runaway: V4-Flash will emit up to 384K output
        /// tokens if asked, and a model stuck in a repetition loop will happily do exactly that
        /// — roughly $0.11 for a single call that should cost $0.0004, before the retry doubles
        /// it. 8,000 is generous headroom over the ~4,000 a 15-question quiz needs, and caps the
        /// worst single call at about a fifth of a cent.
        /// </summary>
        public int MaxOutputTokens { get; set; } = 8_000;

        /// <summary>
        /// Prices used to estimate cost at commit time. Stored per-row so a later price change
        /// doesn't rewrite history. Cache-hit input is billed far cheaper by the provider; we
        /// deliberately estimate at the cache-miss rate, so the number is an upper bound.
        /// </summary>
        public decimal InputCostPerMillionUsd { get; set; } = 0.14m;
        public decimal OutputCostPerMillionUsd { get; set; } = 0.28m;

        /// <summary>
        /// A reservation older than this is assumed abandoned (crashed request, closed tab) and
        /// is released by the sweeper so it stops occupying a quota slot.
        /// </summary>
        public int ReservationTimeoutMinutes { get; set; } = 10;

        // ── Input caps ──

        public int MaxQuestionsPerGeneration { get; set; } = 15;
        public int MaxTopicChars { get; set; } = 200;
        public int MaxSourceChars { get; set; } = 40_000;
        public int MaxExtraInstructionChars { get; set; } = 500;
    }
}
