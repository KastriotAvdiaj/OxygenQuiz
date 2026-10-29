using System.Text.RegularExpressions;

namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// Which language a user's material is written in — English, Albanian, or neither.
    ///
    /// <para><b>Why only two.</b> Source mode writes the questions in the material's own language
    /// (docs/quiz/ai-quiz-generation-flow.md, "Source mode"), so a language is supported only if
    /// the model writes it well enough to put in front of players. English and Albanian are the two
    /// the app is built for and the two the Phase 0 eval measured; anything else is refused up
    /// front with <see cref="AiErrorCodes.UnsupportedLanguage"/> rather than turned into a quiz of
    /// unknown quality. Translating between languages was considered and deferred: it is weak even
    /// on strong models, and it would need a target-language choice the wizard does not have.</para>
    ///
    /// <para><b>Why function words and not a model call.</b> The answer is needed before any quota
    /// or money is spent, on every upload as well as every generation, and counting the commonest
    /// function words answers it: they make up a third or more of running text and differ sharply
    /// between languages. A source that is mostly one language with quotes in another is
    /// classified by its majority, which is what decides the questions' language anyway.</para>
    /// </summary>
    public static class SourceLanguageDetector
    {
        /// <summary>The <c>QuestionLanguages</c> row names, which is what every caller compares against.</summary>
        public const string English = "English";

        /// <inheritdoc cref="English"/>
        public const string Albanian = "Albanian";

        /// <summary>The languages Source mode accepts, in the order the UI names them.</summary>
        public static readonly IReadOnlyList<string> Supported = new[] { English, Albanian };

        /// <summary>
        /// The commonest function words of each language, ~20–40 apiece. Nothing topical, so the
        /// score is about grammar and not subject.
        ///
        /// <para><b>Why lists for languages we refuse.</b> With only English and Albanian to
        /// choose between, Italian passed as Albanian: "e", "i", "per", "se", "si" and "ne" are
        /// common in both. Scoring every nearby language and accepting only when English or
        /// Albanian <i>wins</i> turns that overlap into a lost contest rather than a false match.
        /// Serbo-Croatian and Turkish are here because they are the likeliest other languages in
        /// material from Kosovo and Albania. A language with no list (Greek, Macedonian in
        /// Cyrillic) scores nothing anywhere, so it is refused too.</para>
        ///
        /// <para>Albanian includes the undotted spellings ("eshte", "nje", "qe"), because it is
        /// very often typed without ë and ç, and notes pasted from a phone are exactly that.</para>
        /// </summary>
        private static readonly IReadOnlyDictionary<string, HashSet<string>> FunctionWords =
            new Dictionary<string, HashSet<string>>
            {
                [English] = Words("the and of to in is that it was for on are with as by this be from at or an which were not have has his they their but been its he she we you can will would there these who"),
                [Albanian] = Words("dhe të te në ne një nje është eshte për per me nga se që qe e i u ka si por janë jane ishte nuk kjo ky edhe më do mund ku kur ai ajo ata ato tij saj cila cili pas deri gjatë gjate shumë shume duke kanë kane"),
                ["German"] = Words("der die das und ist in zu den von mit sich des auf für nicht ein eine dem im als auch es an werden aus er hat dass sie nach wird bei"),
                ["French"] = Words("le la les de des et est en un une du que qui dans pour pas sur au ne se par il elle sont avec ce plus aux"),
                ["Spanish"] = Words("el la los las de del y es en un una que por con para se no su al lo como más pero sus le ya"),
                ["Italian"] = Words("il lo la le gli i di del della e è che per un una in con non si da sono al dei nelle nella anche come più ma"),
                ["Portuguese"] = Words("o a os as de do da dos das e é que em um uma para com não por se na no ao mais como"),
                ["Dutch"] = Words("de het een en van is dat in te op met voor zijn niet die aan er als ook bij"),
                ["Turkish"] = Words("ve bir bu da de için ile olan olarak gibi daha çok en ne değil var ama sonra"),
                ["Serbo-Croatian"] = Words("je i u na se da za od su koji koja koje ili kao iz po sa što to ne"),
            };

        /// <summary>
        /// Share of tokens the winner's function words must reach. Real prose sits between 0.3 and
        /// 0.55 against its own list (see the tests); below this the sample is too thin or too
        /// unusual to call.
        /// </summary>
        private const double MinShare = 0.12;

        /// <summary>
        /// How clearly the winner must beat the runner-up. The closest real contest in the tests is
        /// Italian against Albanian, about 2:1; an even English/Albanian mix is about 1:1 and is
        /// refused rather than guessed.
        /// </summary>
        private const double MinRatio = 1.5;

        /// <summary>Below this many function-word hits the sample is too short to say anything.</summary>
        private const int MinHits = 3;

        private static readonly Regex Word = new(@"\p{L}+", RegexOptions.Compiled);

        /// <summary>
        /// <see cref="English"/>, <see cref="Albanian"/>, or <c>null</c> when the text is in another
        /// language, is too short to tell, or is too evenly mixed to call.
        /// </summary>
        public static string? Detect(string? text)
        {
            if (string.IsNullOrWhiteSpace(text)) return null;

            var hits = FunctionWords.Keys.ToDictionary(k => k, _ => 0);
            var total = 0;
            foreach (Match m in Word.Matches(text))
            {
                var token = m.Value.ToLowerInvariant();
                total++;
                foreach (var (language, words) in FunctionWords)
                    if (words.Contains(token)) hits[language]++;
            }

            if (total == 0) return null;

            var ranked = hits.OrderByDescending(h => h.Value).ToList();
            var (winner, best) = (ranked[0].Key, ranked[0].Value);
            var runnerUp = ranked[1].Value;

            if (!Supported.Contains(winner)) return null;
            if (best < MinHits) return null;
            if ((double)best / total < MinShare) return null;
            if (best < runnerUp * MinRatio) return null;
            return winner;
        }

        private static HashSet<string> Words(string list) =>
            new(list.Split(' ', StringSplitOptions.RemoveEmptyEntries), StringComparer.Ordinal);
    }
}
