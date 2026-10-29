namespace QuizAPI.Services.Ai.Sources
{
    /// <summary>
    /// Bound from <c>Ai:Source</c>. Separate from <see cref="AiOptions"/> because grounding is a
    /// different decision from generation: it can be switched off on its own, and a bad source
    /// config should degrade to ungrounded generation rather than take the feature down.
    /// </summary>
    public sealed class SourceOptions
    {
        public const string SectionName = "Ai:Source";

        /// <summary>Off by default. Grounding changes what the model is asked, so it opts in.</summary>
        public bool Enabled { get; set; }

        /// <summary>
        /// Below this, an article is not a source (<see cref="SourceOutcome.TooThin"/>).
        ///
        /// <para>400 is a starting point, not a measured threshold. For scale: sq.wikipedia's
        /// "Historia e Kosovës" is 276 words, which is enough to look grounded and nowhere near
        /// enough for ten questions. Set it from the eval harness's yield numbers once Phase 0
        /// has run.</para>
        /// </summary>
        public int MinSourceWords { get; set; } = 400;

        /// <summary>How many candidates a disambiguation prompt offers. More is a worse question.</summary>
        public int MaxCandidatesToOffer { get; set; } = 5;

        /// <summary>How many search hits to weigh before deciding. Cheap: one request returns all.</summary>
        public int SearchLimit { get; set; } = 5;

        /// <summary>
        /// Ceiling on the extract handed to the prompt — the article's opening, cut at a paragraph.
        ///
        /// <para><b>6,000, not the 40,000 pasted material gets.</b> Set by the current vendor, not by
        /// Wikipedia: Groq's free tier allows about 8,000 tokens a minute and reserves the 4,000 of
        /// <c>Ai:MaxOutputTokens</c> up front, so prompt plus article must fit in roughly 4,000
        /// tokens. The rules take ~1,500; 6,000 characters of English is ~1,500 tokens, and Albanian
        /// costs about a quarter more (docs/quiz/ai-quiz-generation-flow.md §2c). The opening of an
        /// article is its densest summary, so this is the part worth keeping. Raise it with a
        /// vendor that allows more — the eval's per-run token counts say how far.</para>
        /// </summary>
        public int MaxSourceChars { get; set; } = 6_000;

        /// <summary>
        /// Per-request budget. The whole generation sits under a ~100s Cloudflare proxy timeout and
        /// already spends 10–40s in the model, so the lookup gets a small, hard slice of it.
        /// </summary>
        public int TimeoutSeconds { get; set; } = 8;

        /// <summary>
        /// How long a (language, title) extract is cached. Not an optimisation: two HTTP 429s came
        /// back inside a dozen probe requests on 2026-10-28, so repeated lookups of a popular topic
        /// will be rate-limited without this.
        /// </summary>
        public int CacheMinutes { get; set; } = 720;

        /// <summary>
        /// Quiz language name (as stored in <c>QuestionLanguages</c>) to Wikipedia subdomain.
        /// A language with no entry here gets no Wikipedia source at all — deliberately, rather
        /// than silently falling back to English. An English article producing Albanian questions
        /// is a translation task wearing a generation task's clothes, and with a weak model that
        /// is the failure this work exists to remove.
        /// </summary>
        public Dictionary<string, string> LanguageDomains { get; set; } = new(StringComparer.OrdinalIgnoreCase)
        {
            ["English"] = "en",
            ["Albanian"] = "sq",
            ["Spanish"] = "es",
            ["French"] = "fr",
        };

        /// <summary>
        /// Sent on every request. Wikimedia's policy requires a descriptive one and answers an
        /// anonymous agent with HTTP 429 — which is how this was found.
        /// </summary>
        public string UserAgent { get; set; } = "OxygenQuiz/1.0 (https://oxygenquiz.com)";
    }
}
