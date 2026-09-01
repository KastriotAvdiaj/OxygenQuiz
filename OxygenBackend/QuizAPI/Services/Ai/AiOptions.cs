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
        /// Which entry of <see cref="Vendors"/> to use — the <b>only</b> thing an environment
        /// overrides to change who writes the questions.
        ///
        /// <para>Blank falls back to reading the flat <see cref="BaseUrl"/> / <see cref="Model"/> /
        /// cost keys directly, which still works and is warned about at startup. That form is what
        /// this property exists to retire: five values that must move together, with nothing
        /// enforcing it and one of them failing silently when it doesn't.</para>
        /// </summary>
        public string Vendor { get; set; } = string.Empty;

        /// <summary>
        /// Named vendor configurations. Case-insensitive, so <c>Ai__Vendor=GROQ</c> matches
        /// <c>"groq"</c>.
        ///
        /// <para>An entry costs nothing until <see cref="Vendor"/> selects it, which is what makes
        /// this a better home for a vendor you cannot currently use than a default was: a catalogue
        /// entry documents the option, a default silently becomes the thing you are running.</para>
        /// </summary>
        public Dictionary<string, AiVendorOptions> Vendors { get; } =
            new(StringComparer.OrdinalIgnoreCase);

        /// <summary>
        /// Root URL of the resolved vendor. <b>Output, not input</b> — copied from the selected
        /// <see cref="Vendors"/> entry by <see cref="AiConfigurationResolver"/> before anything
        /// reads it. Set it directly only on the deprecated flat path.
        ///
        /// <para>No default. It used to be <c>https://api.deepseek.com</c>, which made DeepSeek the
        /// vendor any environment fell back to without choosing it — including environments that
        /// cannot obtain a DeepSeek key at all. A blank here now means "no vendor selected", which
        /// switches the feature off loudly instead of pointing it somewhere nobody picked.</para>
        /// </summary>
        public string BaseUrl { get; set; } = string.Empty;

        /// <summary>
        /// Model id of the resolved vendor, recorded on every usage row so "which model made this
        /// quiz" is answerable from the data. <b>Output, not input</b> — see <see cref="BaseUrl"/>.
        ///
        /// <para>It is deliberately <b>not</b> shown in the wizard any more. It used to render as
        /// "Questions are written by {Model}" under the quota line, but this is a raw provider
        /// slug (<c>openai/gpt-oss-120b</c>) — an internal identifier, not user-facing copy — and
        /// on the form it answers a question about a generation that has not happened yet.
        /// "Which model made this quiz" is a question about a saved quiz, and the usage row is
        /// where it is answered. See the note in <c>components/quota-note.tsx</c>.</para>
        /// </summary>
        public string Model { get; set; } = string.Empty;

        public string ApiKey { get; set; } = string.Empty;

        /// <summary>Low on purpose — we want recall and obedience, not creativity (plan §8).</summary>
        public double Temperature { get; set; } = 0.3;

        public int TimeoutSeconds { get; set; } = 90;

        /// <summary>
        /// How much a <i>reasoning</i> model is allowed to think before it answers. Sent as
        /// <c>reasoning_effort</c>, and <b>only when set</b> — leave it null and the field never
        /// appears on the wire, so a vendor that has never heard of it is unaffected.
        ///
        /// <para><b>Why this exists.</b> Reasoning tokens are spent before the first content
        /// token and they count against <c>max_tokens</c>. A model that thinks for longer than
        /// its ceiling returns an <i>empty</i> completion, which under
        /// <c>response_format: json_object</c> the vendor rejects as invalid JSON — a 400 that
        /// says nothing about thinking or ceilings. That is a hang dressed as a parse error, and
        /// the palette proposer hit it first because it is the call with the tightest budget.
        /// See <see cref="CategoryPalette.CategoryPalettePromptBuilder.MaxOutputTokens"/>.</para>
        ///
        /// <para><b>Accepted values are the model's, not ours</b>, so nothing validates this at
        /// startup: Groq's gpt-oss models take <c>"low"</c> / <c>"medium"</c> / <c>"high"</c>,
        /// Qwen 3.6 27B takes <c>"none"</c> / <c>"default"</c>, and a non-reasoning model takes
        /// none of them. A wrong value fails as a 400 from the vendor on the first call, which
        /// is visible immediately and cheap. Set it in the same edit as <see cref="Model"/>.</para>
        ///
        /// <para><b>It applies to every call, quiz generation included</b> — it is a property of
        /// the configured model, not of one feature. That is a deliberate simplification and it
        /// has a cost: <c>"low"</c> was chosen for the palette proposer, which needs almost no
        /// thinking, and the generator inherits it even though its 8000-token ceiling could
        /// afford more. If generated quizzes get worse after this is set, that is the first
        /// thing to suspect, and the fix is a per-call override on
        /// <see cref="IQuizAiProvider.CompleteJsonAsync"/> beside the existing token
        /// ceiling.</para>
        /// </summary>
        public string? ReasoningEffort { get; set; }

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
        /// <remarks>
        /// <b>Output, not input</b> — resolved from the selected <see cref="Vendors"/> entry.
        /// Zero is refused at startup rather than defaulted: it is not "free", it is "unpriced",
        /// and both budget caps are enforced against this number.
        /// </remarks>
        public decimal InputCostPerMillionUsd { get; set; }

        /// <remarks><b>Output, not input.</b> Zero is refused — see above.</remarks>
        public decimal OutputCostPerMillionUsd { get; set; }

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
