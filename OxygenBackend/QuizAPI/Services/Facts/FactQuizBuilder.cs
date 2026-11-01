using System.Globalization;
using System.Text;
using System.Text.Json.Nodes;

namespace QuizAPI.Services.Facts
{
    /// <summary>What to build: one pack, in one language, this many questions of these types.</summary>
    /// <param name="DifficultyNames">The app's difficulty names, easiest first is not assumed — see <see cref="FactQuizBuilder.DifficultyFor"/>.</param>
    public sealed record FactQuizRequest(
        string Language,
        int QuestionCount,
        IReadOnlyCollection<string> AllowedTypes,
        IReadOnlyList<string> DifficultyNames);

    /// <param name="Payload">The <c>{ title, category, language, questions }</c> JSON a model reply has — the browser parses it the same way.</param>
    /// <param name="SourceText">Every fact the questions state, one per line: what the parser checks each <c>sourceQuote</c> against.</param>
    public sealed record FactQuizResult(string Payload, string SourceText, int QuestionCount);

    /// <summary>
    /// Turns a pack's facts into questions, with no model involved (docs/quiz/fact-quizzes.md).
    ///
    /// <para><b>The output is a model reply's shape on purpose.</b> The wizard's parser, its
    /// checks, the review and the builder already handle that shape; a fact quiz enters the same
    /// pipe as a generated or pasted one and nothing downstream knows the difference.</para>
    ///
    /// <para><b>Wrong answers come from the same pack</b> — the other capitals, the other peaks'
    /// heights — and from its <i>neighbours in popularity</i>, so a famous capital's distractors
    /// are famous capitals. That is what keeps "What is the capital of France?" from offering
    /// Vaduz.</para>
    ///
    /// <para><b>Difficulty is popularity.</b> The facts with the most Wikipedia articles are the
    /// easiest third, the fewest the hardest: France before Moldova, Korab before Valamara.</para>
    ///
    /// <para>Pure apart from the <see cref="Random"/> it is handed, so a test fixes the seed.</para>
    /// </summary>
    public static class FactQuizBuilder
    {
        public const int MaxQuestions = 20;

        private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;

        public static FactQuizResult Build(FactPack pack, FactQuizRequest request, Random random)
        {
            if (!pack.Templates.TryGetValue(request.Language, out var templates))
                throw new FactQuizException($"\"{Title(pack, request.Language)}\" isn't available in {request.Language}.");

            var styles = templates.Keys
                .Where(s => FactStyles.TypeOf.TryGetValue(s, out var type)
                            && request.AllowedTypes.Contains(type, StringComparer.OrdinalIgnoreCase))
                .ToList();
            if (styles.Count == 0)
                throw new FactQuizException("This pack can't ask any of the question types you picked.");

            // Usable in this language, ranked by popularity — the order difficulty and
            // distractors both read from.
            var facts = pack.Facts
                .Where(f => f.Labels.ContainsKey(request.Language) && (pack.IsQuantity ? f.Amount.HasValue : f.Labels[request.Language].Value is not null))
                .Where(f => pack.IsQuantity || !NamesOverlap(f.Labels[request.Language].Subject, f.Labels[request.Language].Value!))
                .OrderByDescending(f => f.Sitelinks)
                .ThenBy(f => f.Subject, StringComparer.Ordinal)
                .ToList();
            if (facts.Count < 4)
                throw new FactQuizException("This pack doesn't have enough facts in that language for a quiz.");

            var count = Math.Clamp(request.QuestionCount, 1, Math.Min(MaxQuestions, facts.Count));
            var picked = facts.OrderBy(_ => random.Next()).Take(count).ToList();

            var questions = new JsonArray();
            var statements = new List<string>();
            var askedHighest = false;
            var order = styles.OrderBy(_ => random.Next()).ToList();

            for (var i = 0; i < picked.Count; i++)
            {
                var fact = picked[i];
                // Round-robin through the styles so a quiz mixes them, skipping a style that can't
                // be asked of this fact (the lowest peak can't be "the highest of these").
                JsonObject? question = null;
                for (var attempt = 0; attempt < order.Count && question is null; attempt++)
                {
                    var style = order[(i + attempt) % order.Count];
                    if (style == FactStyles.Highest && askedHighest) continue;
                    question = Ask(pack, request.Language, templates, style, fact, facts, random);
                    if (question is not null && style == FactStyles.Highest) askedHighest = true;
                }
                if (question is null) continue;

                question["difficulty"] = DifficultyFor(facts.IndexOf(fact), facts.Count, request.DifficultyNames);
                question["pointSystem"] = "Standard";
                statements.Add(question["sourceQuote"]!.GetValue<string>());
                questions.Add(question);
            }

            var payload = new JsonObject
            {
                ["title"] = Title(pack, request.Language),
                ["category"] = pack.Category,
                ["language"] = request.Language,
                ["questions"] = questions,
            };
            return new FactQuizResult(payload.ToJsonString(), string.Join('\n', statements.Distinct()), questions.Count);
        }

        private static JsonObject? Ask(
            FactPack pack, string language, Dictionary<string, string> templates, string style,
            Fact fact, List<Fact> facts, Random random)
        {
            var me = fact.Labels[language];
            var statement = Fill(templates, FactStyles.Statement, me.Subject, ValueText(pack, fact, language));

            switch (style)
            {
                case FactStyles.Plain:
                {
                    var wrong = Neighbours(fact, facts, 3, f => f.Labels[language].Value!, me.Value!);
                    if (wrong.Count < 3) return null;
                    return MultipleChoice(Fill(templates, style, me.Subject, me.Value!), me.Value!, wrong, statement, random);
                }
                case FactStyles.Reverse:
                {
                    var wrong = Neighbours(fact, facts, 3, f => f.Labels[language].Subject, me.Subject);
                    if (wrong.Count < 3) return null;
                    return MultipleChoice(Fill(templates, style, me.Subject, me.Value!), me.Subject, wrong, statement, random);
                }
                case FactStyles.TrueFalse:
                {
                    var truth = random.Next(2) == 0;
                    var shown = me.Value!;
                    if (!truth)
                    {
                        var other = Neighbours(fact, facts, 1, f => f.Labels[language].Value!, me.Value!);
                        if (other.Count == 0) return null;
                        shown = other[0];
                    }
                    return new JsonObject
                    {
                        ["type"] = "TrueFalse",
                        ["text"] = Fill(templates, style, me.Subject, shown),
                        ["correctAnswer"] = truth,
                        ["timeLimitInSeconds"] = 15,
                        ["explanation"] = statement,
                        ["sourceQuote"] = statement,
                    };
                }
                case FactStyles.Typed:
                    return new JsonObject
                    {
                        ["type"] = "TypeTheAnswer",
                        ["text"] = Fill(templates, style, me.Subject, me.Value!),
                        ["correctAnswer"] = me.Value,
                        ["acceptableAnswers"] = new JsonArray(me.ValueAliases.Select(a => (JsonNode)a).ToArray()),
                        ["isCaseSensitive"] = false,
                        ["timeLimitInSeconds"] = 30,
                        ["explanation"] = statement,
                        ["sourceQuote"] = statement,
                    };
                case FactStyles.Amount:
                {
                    var right = Number(fact.Amount!.Value, pack.Unit);
                    // Distinct by more than rounding: two peaks of 2,485 m would make two right answers.
                    var wrong = Neighbours(fact, facts, 3, f => Number(f.Amount!.Value, pack.Unit), right,
                        f => Math.Abs(f.Amount!.Value - fact.Amount.Value) >= Math.Max(1, fact.Amount.Value * 0.02));
                    if (wrong.Count < 3) return null;
                    return MultipleChoice(Fill(templates, style, me.Subject, right), right, wrong, statement, random);
                }
                case FactStyles.Highest:
                {
                    // Three lower than this one, nearest first: "highest of Korab, Jezercë, Kollata,
                    // Gramoz" is a real question; "highest of Korab and three hills" isn't.
                    var lower = facts
                        .Where(f => f != fact && f.Amount < fact.Amount - Math.Max(1, fact.Amount!.Value * 0.01))
                        .OrderByDescending(f => f.Amount)
                        .Take(3)
                        .ToList();
                    if (lower.Count < 3) return null;
                    var others = lower.Select(f => f.Labels[language].Subject).ToList();
                    var explanation = string.Join(" ", new[] { fact }.Concat(lower)
                        .Select(f => Fill(templates, FactStyles.Statement, f.Labels[language].Subject, ValueText(pack, f, language))));
                    var q = MultipleChoice(templates[style], me.Subject, others, statement, random);
                    q["explanation"] = explanation;
                    return q;
                }
                case FactStyles.Compare:
                {
                    var other = facts
                        .Where(f => f != fact && Math.Abs(f.Amount!.Value - fact.Amount!.Value) >= Math.Max(1, fact.Amount.Value * 0.02))
                        .OrderBy(f => Math.Abs(facts.IndexOf(f) - facts.IndexOf(fact)))
                        .ThenBy(_ => random.Next())
                        .FirstOrDefault();
                    if (other is null) return null;
                    var otherStatement = Fill(templates, FactStyles.Statement, other.Labels[language].Subject, ValueText(pack, other, language));
                    return new JsonObject
                    {
                        ["type"] = "TrueFalse",
                        ["text"] = Fill(templates, style, me.Subject, ValueText(pack, fact, language), other.Labels[language].Subject),
                        ["correctAnswer"] = fact.Amount > other.Amount,
                        ["timeLimitInSeconds"] = 15,
                        ["explanation"] = $"{statement} {otherStatement}",
                        ["sourceQuote"] = statement,
                    };
                }
                default:
                    return null;
            }
        }

        /// <summary>
        /// Up to <paramref name="count"/> other facts' answers, nearest in popularity first — a
        /// famous fact's wrong options are famous too. Ties broken at random so a pack doesn't ask
        /// the same four-way choice every time.
        /// </summary>
        private static List<string> Neighbours(
            Fact fact, List<Fact> facts, int count, Func<Fact, string> answer, string right, Func<Fact, bool>? also = null)
        {
            var at = facts.IndexOf(fact);
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { Fold(right) };
            var result = new List<string>();
            foreach (var f in facts.Where(f => f != fact && (also?.Invoke(f) ?? true))
                         .OrderBy(f => Math.Abs(facts.IndexOf(f) - at)))
            {
                var text = answer(f);
                if (!seen.Add(Fold(text))) continue;
                result.Add(text);
                if (result.Count == count) break;
            }
            return result;
        }

        private static JsonObject MultipleChoice(string text, string right, List<string> wrong, string statement, Random random)
        {
            var options = wrong.Select(w => (Text: w, Correct: false))
                .Append((Text: right, Correct: true))
                .OrderBy(_ => random.Next())
                .Select(o => (JsonNode)new JsonObject { ["text"] = o.Text, ["isCorrect"] = o.Correct })
                .ToArray();
            return new JsonObject
            {
                ["type"] = "MultipleChoice",
                ["text"] = text,
                ["answerOptions"] = new JsonArray(options),
                ["allowMultipleSelections"] = false,
                ["timeLimitInSeconds"] = 20,
                ["explanation"] = statement,
                ["sourceQuote"] = statement,
            };
        }

        /// <summary>
        /// The fact's popularity third, named in the app's own difficulty words. Matched by name
        /// ("Easy"/"Medium"/"Hard", in either language), else by position in the list given.
        /// </summary>
        internal static string? DifficultyFor(int rank, int total, IReadOnlyList<string> names)
        {
            if (names.Count == 0) return null;
            var third = Math.Min(2, rank * 3 / Math.Max(1, total));
            string[][] words = { new[] { "easy", "lehte" }, new[] { "medium", "mesatar", "mesme" }, new[] { "hard", "veshtire" } };
            var named = names.FirstOrDefault(n => words[third].Any(w => Fold(n).Contains(w)));
            return named ?? names[Math.Min(names.Count - 1, third * names.Count / 3)];
        }

        private static string Fill(Dictionary<string, string> templates, string style, string subject, string value, string? other = null) =>
            Fill(templates[style], subject, value, other);

        private static string Fill(string template, string subject, string value, string? other = null) =>
            template.Replace("{subject}", subject).Replace("{value}", value).Replace("{other}", other ?? string.Empty);

        private static string ValueText(FactPack pack, Fact fact, string language) =>
            pack.IsQuantity ? Number(fact.Amount!.Value, null) : fact.Labels[language].Value!;

        /// <summary>No thousands separator: English writes 2,764 and Albanian 2.764 or 2 764, and "2764" is read the same in both.</summary>
        private static string Number(double value, string? unit)
        {
            var text = Math.Round(value).ToString("0", Invariant);
            return string.IsNullOrEmpty(unit) ? text : $"{text} {unit}";
        }

        private static string Title(FactPack pack, string language) =>
            pack.Title.TryGetValue(language, out var t) ? t : pack.Title.Values.FirstOrDefault() ?? pack.Slug;

        /// <summary>
        /// Whether one name contains the other — Monaco's capital is Monaco, Andorra's is Andorra la
        /// Vella. Asking those gives the answer away, so they aren't asked.
        /// </summary>
        internal static bool NamesOverlap(string a, string b)
        {
            var (x, y) = (Fold(a), Fold(b));
            if (x.Length == 0 || y.Length == 0) return false;
            if (x.Contains(y) || y.Contains(x)) return true;
            // Albanian inflects the shared stem: Luksemburg / Luksemburgu, Vatikan / Vatikani.
            return x.Length >= 5 && y.Length >= 5 && string.CompareOrdinal(x, 0, y, 0, Math.Min(6, Math.Min(x.Length, y.Length))) == 0;
        }

        private static string Fold(string text)
        {
            var sb = new StringBuilder(text.Length);
            foreach (var c in text.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD))
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) sb.Append(c);
            return sb.ToString();
        }
    }

    /// <summary>A request the pack can't serve. Its message is shown to the author.</summary>
    public sealed class FactQuizException(string message) : Exception(message);
}
