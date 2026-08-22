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
        /// <c>"OpenAiCompatible"</c> or <c>"Fake"</c> — <b>how</b> a completion is fetched, not
        /// <b>who</b> from. The vendor is <see cref="BaseUrl"/> plus <see cref="Model"/>, and
        /// changing vendor never touches this value.
        ///
        /// <para><c>"Fake"</c> returns canned questions with no network call and no cost, so the
        /// whole feature — quota, budget, audit, error mapping, the browser parser, the review
        /// builder — can be exercised before an API key exists. Program.cs refuses it in
        /// Production, and refuses any value that is neither of these: a typo used to fall
        /// through to "make real paid calls", which is the wrong default for a typo.</para>
        ///
        /// <para>The legacy values <c>"DeepSeek"</c> and <c>"Qwen"</c> still boot, with a startup
        /// warning, so an existing <c>.env</c> survives the 2026-08-22 rename.</para>
        /// </summary>
        public string Provider { get; set; } = "OpenAiCompatible";

        /// <summary>
        /// The vendor. Anything speaking the OpenAI ChatCompletions format works — see
        /// <see cref="OpenAiCompatibleQuizAiProvider"/> for the three things to check first.
        /// <list type="bullet">
        ///   <item><description>DeepSeek: <c>https://api.deepseek.com</c></description></item>
        ///   <item><description>Qwen (Alibaba Model Studio, Singapore): the workspace-scoped
        ///     <c>compatible-mode/v1</c> URL from the console</description></item>
        /// </list>
        /// Changing this means changing <see cref="Model"/> and both cost-per-million values in
        /// the same edit — a vendor swap that leaves the old prices behind silently mis-prices
        /// every row in the ledger.
        /// </summary>
        public string BaseUrl { get; set; } = "https://api.deepseek.com";

        /// <summary>
        /// Model id, recorded on every usage row and shown in the wizard, so "which model made
        /// this quiz" is answerable from the data.
        ///
        /// <para>NOTE: <c>deepseek-chat</c> / <c>deepseek-reasoner</c> were retired 2026-07-24 in
        /// favour of the V4 names. Re-check against api-docs.deepseek.com before changing.</para>
        /// </summary>
        public string Model { get; set; } = "deepseek-v4-flash";

        public string ApiKey { get; set; } = string.Empty;

        /// <summary>Low on purpose — we want recall and obedience, not creativity (plan §8).</summary>
        public double Temperature { get; set; } = 0.3;

        public int TimeoutSeconds { get; set; } = 90;

        // ── Quota and spend ──

        /// <summary>
        /// Generations per user per UTC day. Low on purpose while the feature is new: it is the
        /// tightest of the spend ceilings and the easiest to raise once real usage is visible in
        /// <c>AiGenerationUsages</c>. The number is shown in the UI, so changing it changes what
        /// users are promised — raise it deliberately, not by accident.
        /// </summary>
        public int DefaultDailyQuota { get; set; } = 2;

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
        /// — roughly $0.25 for a single call that should cost about $0.001, before the retry
        /// doubles it. 8,000 is generous headroom over the ~4,000 a 15-question quiz needs, and
        /// caps the worst single call at about half a cent (at the off-peak rates below).
        ///
        /// <para><b>It also has to fit under the vendor's per-minute token allowance, and that is
        /// not obvious.</b> Vendors reserve <c>max_tokens</c> against the rate limit up front,
        /// whether the model uses them or not — so on a free tier with an 8,000 tokens-per-minute
        /// ceiling, an 8,000 setting plus a ~900-token prompt is refused *before generation starts*
        /// and no amount of waiting helps. That is a real failure we hit on Groq's free tier
        /// (2026-08-22), reported as 413 <c>rate_limit_exceeded</c>. Rule of thumb: this value plus
        /// your prompt must be under the vendor's TPM limit. 4,000 covers a 15-question quiz and
        /// leaves room under an 8,000 ceiling.</para>
        /// </summary>
        public int MaxOutputTokens { get; set; } = 8_000;

        /// <summary>
        /// Prices used to estimate cost at commit time. Stored per-row so a later price change
        /// doesn't rewrite history. Cache-hit input is billed far cheaper by the vendor; we
        /// deliberately estimate at the cache-miss rate, so the number is an upper bound.
        ///
        /// <para><b>These belong to whatever <see cref="BaseUrl"/> points at, and they go stale
        /// silently.</b> Nothing validates them against the vendor, so a wrong number doesn't
        /// fail — it under-reports every row and quietly loosens
        /// <see cref="DailyBudgetUsd"/> and <see cref="MonthlyBudgetUsd"/> by the same factor,
        /// because both caps are enforced against this estimate. Defaults track DeepSeek
        /// V4-Flash <b>off-peak</b> as of 2026-08-22 ($0.22 / $0.66 per million); DeepSeek
        /// doubles both during 01:00–04:00 and 06:00–10:00 UTC, which this flat model does not
        /// represent — see the open gap in docs/quiz/ai-quiz-generation-flow.md §9.</para>
        /// </summary>
        public decimal InputCostPerMillionUsd { get; set; } = 0.22m;
        public decimal OutputCostPerMillionUsd { get; set; } = 0.66m;

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
