using System.Text;
using QuizAPI.ManyToManyTables;
// QuestionType lives in QuizAPI.Models, not QuizAPI.Models.Questions — the file sits under
// Models/Questions/ but the namespace doesn't follow the folder.
using QuizAPI.Models;

namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// Builds the quiz-generation prompt. A C# port of <c>src/.../AI-Quiz/prompt.ts</c>, intended
    /// to <b>replace</b> it in slice 2.1 — until then the two are duplicates and an edit must be
    /// made in both (docs/quiz/ai-quiz-generation-flow.md §9, gap 2).
    ///
    /// <para><b>Rules that are not negotiable</b> (docs/quiz/ai-quiz-creation-plan.md §5):</para>
    /// <list type="bullet">
    ///   <item>The prompt never contains an entity id. Names only, and only names that exist.</item>
    ///   <item>Individual <b>questions</b> never carry a category or language — they inherit the
    ///     quiz's. The model may suggest the <b>quiz's</b> category and language when asked, and
    ///     a human confirms both before anything is saved. See the note below.</item>
    ///   <item>The word "json" appears deliberately: DeepSeek's JSON mode refuses the request
    ///     without it.</item>
    /// </list>
    ///
    /// <para><b>On quiz-level suggestions.</b> The original design said the model outputs no
    /// category or language at all. That rule existed to stop the AI determining a question's
    /// classification, and that still holds — questions inherit, always. What changed is that a
    /// human's "choice" of the quiz's category can be made by confirming a pre-filled value in
    /// the review step rather than by filling a dropdown before generating. The safety property
    /// is unchanged: the model picks from names we supply, an unmatched name is discarded, no
    /// entity is ever created, and nothing persists without review.</para>
    ///
    /// <para>Rules are numbered programmatically. They used to be hand-numbered, which meant an
    /// optional rule in the middle silently renumbered everything after it.</para>
    /// </summary>
    public sealed class AiPromptBuilder
    {
        public const int MinTimeLimit = 5;
        public const int MaxTimeLimit = 300;
        public const int MaxTitleLength = 80;

        /// <summary>
        /// The only per-question time limits the app can render.
        ///
        /// <para>Mirrors <c>TIME_LIMIT_OPTIONS</c> in the frontend's
        /// <c>Create-Quiz-Form/constants.ts</c>, and is sent to the model as an enum for the same
        /// reason category, language, difficulty and point system are: the client has a fixed
        /// dropdown for it, so a value outside this set has nowhere to render. Asking for "an
        /// integer between 5 and 300" instead — which this did — meant a fully obedient model
        /// could answer 22 and leave the author staring at an empty select that was silently
        /// holding 22.</para>
        ///
        /// <para><see cref="MinTimeLimit"/> and <see cref="MaxTimeLimit"/> remain the outer bounds
        /// for anything that arrives by another door (data transfer, direct API); this is the
        /// narrower set we actually ask for.</para>
        /// </summary>
        public static readonly int[] AllowedTimeLimits =
            { 5, 10, 15, 20, 30, 45, 60, 90, 120 };

        /// <summary>
        /// Per-type field requirements, keyed by the exact string the model must emit.
        ///
        /// <c>allowPartialMatch</c> is deliberately absent: it is a grading rule the quiz author
        /// owns, not a property of the question's content. Asked without guidance the model set
        /// it arbitrarily, which silently made typed answers guessable. See
        /// docs/quiz/typed-answer-matching.md.
        /// </summary>
        private static readonly IReadOnlyDictionary<string, string> TypeSpecs =
            new Dictionary<string, string>(StringComparer.Ordinal)
            {
                [nameof(QuestionType.MultipleChoice)] =
                    """
                      - "MultipleChoice" also requires:
                          "answerOptions": array of 2 to 4 objects, each { "text": string, "isCorrect": boolean }
                          "allowMultipleSelections": boolean (true only if more than one option is correct)
                        At least one option MUST have "isCorrect": true.
                    """,
                [nameof(QuestionType.TrueFalse)] =
                    """
                      - "TrueFalse" also requires:
                          "correctAnswer": boolean (true or false, not a string)
                    """,
                [nameof(QuestionType.TypeTheAnswer)] =
                    """
                      - "TypeTheAnswer" also requires:
                          "correctAnswer": string (the canonical answer, kept short — a word or short phrase)
                          "acceptableAnswers": array of strings (other spellings/synonyms you would accept; may be empty)
                          "isCaseSensitive": boolean (almost always false)
                    """,
            };

        /// <summary>
        /// Every type the model may be asked for. Derived from <see cref="TypeSpecs"/> rather
        /// than listed again, so adding a question type cannot leave the two out of step —
        /// a type with no spec would otherwise be requested and then not explained.
        /// </summary>
        public static readonly IReadOnlySet<string> SupportedTypes =
            TypeSpecs.Keys.ToHashSet(StringComparer.Ordinal);

        public string Build(AiGenerationRequest request)
        {
            var askForCategory = request.CategoryNames.Count > 0;
            // Only ask the model to choose a language when the user hasn't. An explicit choice
            // is an instruction; asking anyway would invite it to overrule them.
            var askForLanguage = string.IsNullOrWhiteSpace(request.LanguageName)
                                 && request.LanguageNames.Count > 0;

            var isTopic = request.Mode == AiGenerationMode.Topic;

            var sb = new StringBuilder();
            sb.AppendLine(isTopic
                ? $"You are a quiz-generation engine. Produce EXACTLY {request.QuestionCount} quiz question(s) about the SUBJECT given at the end of this message."
                : $"You are a quiz-generation engine. Read the SOURCE MATERIAL at the end of this message and produce EXACTLY {request.QuestionCount} quiz question(s) based ONLY on it.");
            sb.AppendLine();
            sb.AppendLine("OUTPUT RULES — follow these precisely:");
            sb.AppendLine();

            var rules = BuildRules(request, askForCategory, askForLanguage, isTopic);
            for (var i = 0; i < rules.Count; i++)
            {
                sb.AppendLine($"{i + 1}. {rules[i]}");
                sb.AppendLine();
            }

            sb.AppendLine(isTopic ? "SUBJECT:" : "SOURCE MATERIAL:");
            sb.AppendLine("\"\"\"");
            sb.AppendLine(((isTopic ? request.Topic : request.SourceText) ?? string.Empty).Trim());
            sb.Append("\"\"\"");

            return sb.ToString();
        }

        private static List<string> BuildRules(
            AiGenerationRequest r, bool askForCategory, bool askForLanguage, bool isTopic)
        {
            var typeList = Quoted(r.AllowedTypes);
            var difficultyList = Quoted(r.DifficultyNames);
            var categoryList = Quoted(r.CategoryNames);
            var languageList = Quoted(r.LanguageNames);
            var pointSystems = Quoted(Enum.GetNames<PointSystem>());

            var rules = new List<string>
            {
                "Respond with a SINGLE json object and NOTHING else. No explanation, no commentary, no markdown code fences.",
                "The object must have exactly this shape:\n\n" + ShapeBlock(
                    typeList, difficultyList, pointSystems, categoryList, languageList,
                    askForCategory, askForLanguage),
                $"\"title\": a short, specific title for the quiz — at most {MaxTitleLength} characters. Name the subject; don't pad it with the word \"Quiz\".",
            };

            if (askForCategory)
            {
                rules.Add(
                    $"\"category\" MUST be exactly one of: {categoryList}. Pick the closest fit. "
                    + "If none of them fits, use null — do NOT invent a category name.");
            }

            if (askForLanguage)
            {
                rules.Add(
                    $"\"language\" MUST be exactly one of: {languageList}. Pick the language the "
                    + (isTopic ? "SUBJECT is written in" : "SOURCE MATERIAL is written in")
                    + ", and write every question in that same language. If you can't tell, use null.");
            }

            rules.Add("Depending on \"type\", each question needs these ADDITIONAL fields:\n"
                      + string.Join(Environment.NewLine, r.AllowedTypes.Where(TypeSpecs.ContainsKey).Select(t => TypeSpecs[t])));

            rules.Add($"\"difficulty\" MUST be exactly one of: {difficultyList}. Do not invent difficulty names, do not translate them, do not use any other value.");

            rules.Add("Do NOT put a category or a language on an individual question. Those are quiz-level fields only, and any you add to a question will be ignored.");

            rules.Add($"\"timeLimitInSeconds\" MUST be exactly one of these numbers: {string.Join(", ", AllowedTimeLimits)}. Do not use any other number, and do not write it as a string.");

            rules.Add("Scale \"pointSystem\" and \"timeLimitInSeconds\" with how hard the question is, so the quiz ramps up: easier recall questions should be \"Standard\" with a short time limit, while harder reasoning or synthesis questions should be \"Double\" or \"Quadruple\" with more time.");

            // Language instruction, when the user already made the choice for us.
            if (!askForLanguage && !string.IsNullOrWhiteSpace(r.LanguageName))
            {
                rules.Add($"Write every question and every answer in {r.LanguageName.Trim()}. This applies to the question text, the options, and the accepted answers.");
            }
            else if (!askForLanguage && !isTopic)
            {
                rules.Add("Write every question in the SAME LANGUAGE as the source material.");
            }

            rules.Add(isTopic
                // Topic mode has no source to ground it, so the model is recalling facts and the
                // characteristic failure is a confident wrong answer. This bounds the problem; the
                // human review step is what actually solves it. See plan §8.
                ? "Ask only about well-established, verifiable facts that a reference work would agree on. Do NOT write questions about recent events, current office-holders, current prices or statistics, records, or anything phrased as \"the latest\" or \"the most recent\" — your knowledge has a cutoff and those answers go stale. Prefer durable knowledge. If you are not confident an answer is correct, ask a different question instead."
                : "Base every question strictly on the source material. Do not invent facts that are not present in it. Make sure the answer you mark as correct is actually correct according to the source.");

            if (!string.IsNullOrWhiteSpace(r.ExtraInstructions))
                rules.Add($"Additional instructions from the user: {r.ExtraInstructions.Trim()}");

            return rules;
        }

        private static string ShapeBlock(
            string typeList, string difficultyList, string pointSystems,
            string categoryList, string languageList, bool askForCategory, bool askForLanguage)
        {
            var sb = new StringBuilder();
            sb.AppendLine("{");
            sb.AppendLine("  \"title\": string,");
            if (askForCategory) sb.AppendLine($"  \"category\": {categoryList} | null,");
            if (askForLanguage) sb.AppendLine($"  \"language\": {languageList} | null,");
            sb.AppendLine("  \"questions\": [");
            sb.AppendLine("    {");
            sb.AppendLine($"      \"type\": {typeList},");
            sb.AppendLine("      \"text\": string,");
            sb.AppendLine($"      \"difficulty\": {difficultyList},");
            sb.AppendLine($"      \"pointSystem\": {pointSystems},");
            sb.AppendLine($"      \"timeLimitInSeconds\": {string.Join(" | ", AllowedTimeLimits)}");
            sb.AppendLine("    }");
            sb.AppendLine("  ]");
            sb.Append('}');
            return sb.ToString();
        }

        private static string Quoted(IEnumerable<string> values) =>
            string.Join(" | ", values.Select(v => $"\"{v}\""));
    }
}
