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
        /// Cache-miss input rate, so the recorded cost is an upper bound on the real bill. Must be
        /// greater than zero: a rate of zero prices every generation at nothing, which would let
        /// the budget caps pass forever. That is the one failure here that is completely silent,
        /// which is why it is validated rather than defaulted.
        /// </summary>
        public decimal InputCostPerMillionUsd { get; set; }

        /// <summary>Cache-miss output rate. Must be greater than zero, for the reason above.</summary>
        public decimal OutputCostPerMillionUsd { get; set; }
    }
}
