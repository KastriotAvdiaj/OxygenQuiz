namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// One entry in the <c>Ai:Vendors</c> catalogue: everything that changes when you change
    /// who writes the questions, and nothing that doesn't.
    ///
    /// <para><b>Why these five live together.</b> They are one decision, not five, and the
    /// codebase learned that the hard way — three separate comments used to beg the reader to
    /// remember it. A swap that leaves the old prices behind silently mis-prices every row in
    /// <c>AiGenerationUsages</c>, which is also what both budget caps are enforced against, so
    /// the caps loosen by exactly the factor you got wrong and nothing anywhere says so. A swap
    /// that leaves the old <see cref="ReasoningEffort"/> behind sends a field the new model may
    /// refuse — or, worse, omits one the new model needs, and a reasoning model with no effort
    /// budget spends its whole output allowance thinking and returns an empty completion.
    ///
    /// <para>Grouping them under a name means an environment selects a vendor with one value
    /// (<c>Ai:Vendor</c>) instead of overriding five keys and hoping it remembered all of them.
    /// A partially-filled entry is refused at startup rather than run.</para></para>
    /// </summary>
    public sealed class AiVendorOptions
    {
        /// <summary>
        /// Root URL of an OpenAI-compatible ChatCompletions endpoint. No trailing slash needed;
        /// Program.cs adds one, because without it the relative "chat/completions" would replace
        /// the last path segment rather than append to it.
        /// </summary>
        public string BaseUrl { get; set; } = string.Empty;

        /// <summary>Model id, recorded on every usage row so "which model made this quiz" is answerable.</summary>
        public string Model { get; set; } = string.Empty;

        /// <summary>
        /// Reasoning models only. Sent as <c>reasoning_effort</c> and <b>only when set</b>, so a
        /// vendor that has never heard of the field never sees it. Values belong to the model —
        /// "low"/"medium"/"high" for Groq's gpt-oss, "none"/"default" for Qwen 3.6 27B.
        /// </summary>
        public string? ReasoningEffort { get; set; }

        /// <summary>
        /// Reasoning models only: tokens added to <b>every</b> call's <c>max_tokens</c> for the
        /// model's thinking, which it spends inside the same ceiling and before any answer.
        /// Zero (the default) for a model that thinks briefly or not at all.
        ///
        /// <para><b>Why the vendor's and not one bigger <c>Ai:MaxOutputTokens</c>.</b> How long
        /// a model thinks is a property of the model, like <see cref="ReasoningEffort"/>, and the
        /// ceilings are per call: the palette proposer's 1,500 fits its answer, not DeepSeek V4.1
        /// Flash's thinking, which ran 1,800–11,100 tokens at <c>"low"</c> on quiz prompts
        /// (eval, 2026-11-07). Raising only the top-level key would leave the palette cut off,
        /// and would break the <c>groq</c> entry, whose free tier refuses any request over 8,000
        /// tokens a minute. A reply cut off at the ceiling fails JSON extraction and releases the
        /// quota slot, so too small a value shows up as generation failures, not as cost.</para>
        /// </summary>
        public int ThinkingTokens { get; set; }

        /// <summary>
        /// Cache-miss input rate, so the recorded cost is an upper bound on the real bill. Must be
        /// greater than zero: a rate of zero prices every generation at nothing, which would let
        /// the budget caps pass forever. That is the one failure here that is completely silent,
        /// which is why it is validated rather than defaulted.
        /// </summary>
        public decimal InputCostPerMillionUsd { get; set; }

        /// <summary>Cache-miss output rate. Must be greater than zero, for the reason above.</summary>
        public decimal OutputCostPerMillionUsd { get; set; }

        /// <summary>
        /// Whether this model may write quizzes from a user's own material (Source mode: pasted
        /// text or an uploaded file). <b>Off unless an entry says otherwise.</b>
        ///
        /// <para>A property of the model, not of the deployment, which is why it lives in the
        /// entry: Source mode asks for verbatim quotes, long inputs and writing in the source's
        /// language, and a weak model fails all three in ways a user blames on their material.
        /// The Phase 0 baseline measured the free Groq model at 24.6% wrong in Albanian with
        /// fluency 3.12/4 (docs/quiz/ai-question-accuracy-plan.md), and its free tier's
        /// tokens-per-minute ceiling is below what a full 40,000-character source costs — so the
        /// <c>groq</c> entry leaves this off. Selecting a stronger vendor whose entry sets it is
        /// how the mode opens; no code change, no frontend flag.</para>
        /// </summary>
        public bool AllowsSourceMode { get; set; }

        /// <summary>
        /// Whether the model reads images — what screenshot import needs (docs/quiz/screenshot-import.md).
        /// A property of the model, like <see cref="AllowsSourceMode"/>: a text-only model sent an
        /// image fails the call, so only an entry that says so opens the feature.
        /// </summary>
        public bool AllowsImages { get; set; }
    }
}
