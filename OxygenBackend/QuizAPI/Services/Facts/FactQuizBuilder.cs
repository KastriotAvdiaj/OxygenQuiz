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
            var names = new Names(pack, language);
            var statement = names.Fill(templates[FactStyles.Statement], fact);
            if (statement is null) return null;

            switch (style)
            {
                case FactStyles.Plain:
                {
                    var text = names.Fill(templates[style], fact);
                    var wrong = Neighbours(fact, facts, 3, names.ValueOption, names.ValueOption(fact));
                    if (text is null || wrong.Count < 3) return null;
                    return MultipleChoice(text, names.ValueOption(fact), wrong, statement, random);
                }
                case FactStyles.Reverse:
                {
                    var text = names.Fill(templates[style], fact);
                    var wrong = Neighbours(fact, facts, 3, names.SubjectOption, names.SubjectOption(fact));
                    if (text is null || wrong.Count < 3) return null;
                    return MultipleChoice(text, names.SubjectOption(fact), wrong, statement, random);
                }
                case FactStyles.TrueFalse:
                {
                    var truth = random.Next(2) == 0;
                    var shown = fact;
                    if (!truth)
                    {
                        // A neighbour's capital, never one that reads the same as the right one.
                        shown = NeighbourFacts(fact, facts, names.ValueOption)
                            .FirstOrDefault(f => !string.Equals(Fold(names.ValueOption(f)), Fold(names.ValueOption(fact)), StringComparison.Ordinal));
                        if (shown is null) return null;
                    }
                    var text = names.Fill(templates[style], fact, valueOf: shown);
                    if (text is null) return null;
                    return new JsonObject
                    {
                        ["type"] = "TrueFalse",
                        ["text"] = text,
                        ["correctAnswer"] = truth,
                        ["timeLimitInSeconds"] = 15,
                        ["explanation"] = statement,
                        ["sourceQuote"] = statement,
                    };
                }
                case FactStyles.Typed:
                {
                    var text = names.Fill(templates[style], fact);
                    if (text is null) return null;
                    var me = fact.Labels[language];
                    var answer = names.ValueOption(fact);
                    // The label is accepted too when the answer is its other form (Roma / Romë).
                    var accepted = me.ValueAliases.Prepend(me.Value!)
                        .Where(a => !string.Equals(a, answer, StringComparison.OrdinalIgnoreCase))
                        .Distinct(StringComparer.OrdinalIgnoreCase);
                    return new JsonObject
                    {
                        ["type"] = "TypeTheAnswer",
                        ["text"] = text,
                        ["correctAnswer"] = answer,
                        ["acceptableAnswers"] = new JsonArray(accepted.Select(a => (JsonNode)a).ToArray()),
                        ["isCaseSensitive"] = false,
                        ["timeLimitInSeconds"] = 30,
                        ["explanation"] = statement,
                        ["sourceQuote"] = statement,
                    };
                }
                case FactStyles.Amount:
                {
                    var text = names.Fill(templates[style], fact);
                    var right = Number(fact.Amount!.Value, pack.Unit);
                    // Distinct by more than rounding: two peaks of 2,485 m would make two right answers.
                    var wrong = Neighbours(fact, facts, 3, f => Number(f.Amount!.Value, pack.Unit), right,
                        f => Math.Abs(f.Amount!.Value - fact.Amount.Value) >= Math.Max(1, fact.Amount.Value * 0.02));
                    if (text is null || wrong.Count < 3) return null;
                    return MultipleChoice(text, right, wrong, statement, random);
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
                    var others = lower.Select(names.SubjectOption).ToList();
                    var explanation = string.Join(" ", new[] { fact }.Concat(lower)
                        .Select(f => names.Fill(templates[FactStyles.Statement], f) ?? string.Empty));
                    var q = MultipleChoice(templates[style], names.SubjectOption(fact), others, statement, random);
                    q["explanation"] = explanation.Trim();
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
                    var text = names.Fill(templates[style], fact, other: other);
                    var otherStatement = names.Fill(templates[FactStyles.Statement], other);
                    if (text is null || otherStatement is null) return null;
                    return new JsonObject
                    {
                        ["type"] = "TrueFalse",
                        ["text"] = text,
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
        /// famous fact's wrong options are famous too.
        /// </summary>
        private static List<string> Neighbours(
            Fact fact, List<Fact> facts, int count, Func<Fact, string> answer, string right, Func<Fact, bool>? also = null)
        {
            var seen = new HashSet<string>(StringComparer.Ordinal) { Fold(right) };
            var result = new List<string>();
            foreach (var f in NeighbourFacts(fact, facts, answer, also))
            {
                var text = answer(f);
                if (!seen.Add(Fold(text))) continue;
                result.Add(text);
                if (result.Count == count) break;
            }
            return result;
        }

        private static IEnumerable<Fact> NeighbourFacts(Fact fact, List<Fact> facts, Func<Fact, string> answer, Func<Fact, bool>? also = null)
        {
            var at = facts.IndexOf(fact);
            return facts.Where(f => f != fact && (also?.Invoke(f) ?? true)).OrderBy(f => Math.Abs(facts.IndexOf(f) - at));
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

        /// <summary>No thousands separator: English writes 2,764 and Albanian 2.764 or 2 764, and "2764" is read the same in both.</summary>
        private static string Number(double value, string? unit)
        {
            var text = Math.Round(value).ToString("0", Invariant);
            return string.IsNullOrEmpty(unit) ? text : $"{text} {unit}";
        }

        private static string Title(FactPack pack, string language) =>
            pack.Title.TryGetValue(language, out var t) ? t : pack.Title.Values.FirstOrDefault() ?? pack.Slug;

        internal static string Fold(string text)
        {
            var sb = new StringBuilder(text.Length);
            foreach (var c in text.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD))
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) sb.Append(c);
            return sb.ToString();
        }
    }

    /// <summary>
    /// The words a template is filled with, in one language (docs/quiz/fact-quizzes.md, "Grammar").
    ///
    /// <para><c>{subject}</c>, <c>{value}</c> and <c>{other}</c> are the Wikidata labels as they
    /// are. <c>{subject.gen}</c>, <c>{value.def}</c> and so on ask for a <b>form</b> from the pack's
    /// hand-written <c>forms</c> table — Albanian needs "kryeqyteti i <i>Francës</i>", and the label is
    /// <i>Francë</i>. A missing form means the template can't be filled for that fact, and the style
    /// is skipped for it, rather than written badly. The one exception is <c>def</c>, which falls
    /// back to the label: most labels already are the definite form (<i>Parisi</i>, <i>Turqia</i>).</para>
    ///
    /// <para>Options and typed answers use the definite form too, so one question doesn't offer
    /// <i>Parisi</i> beside <i>Romë</i>.</para>
    /// </summary>
    internal sealed class Names(FactPack pack, string language)
    {
        private static readonly System.Text.RegularExpressions.Regex Placeholder =
            new(@"\{(subject|value|other)(?:\.([a-z]+))?\}", System.Text.RegularExpressions.RegexOptions.Compiled);

        /// <summary>The template filled for <paramref name="fact"/>; null if a form it asks for is missing.</summary>
        /// <param name="valueOf">Whose value to state — a different fact for a false true/false claim.</param>
        public string? Fill(string template, Fact fact, Fact? valueOf = null, Fact? other = null)
        {
            valueOf ??= fact;
            var complete = true;
            var text = Placeholder.Replace(template, m =>
            {
                var form = m.Groups[2].Success ? m.Groups[2].Value : null;
                var word = m.Groups[1].Value switch
                {
                    "subject" => Name(fact.Subject, fact.Labels[language].Subject, form),
                    "other" => other is null ? null : Name(other.Subject, other.Labels[language].Subject, form),
                    _ => pack.IsQuantity
                        ? Math.Round(valueOf.Amount!.Value).ToString("0", CultureInfo.InvariantCulture)
                        : Name(valueOf.Value!, valueOf.Labels[language].Value!, form),
                };
                if (word is null) complete = false;
                return word ?? string.Empty;
            });
            return complete ? text : null;
        }

        /// <summary>The value as an option or a typed answer: its definite form.</summary>
        public string ValueOption(Fact fact) => Name(fact.Value!, fact.Labels[language].Value!, "def")!;

        public string SubjectOption(Fact fact) => Name(fact.Subject, fact.Labels[language].Subject, "def")!;

        private string? Name(string qid, string label, string? form)
        {
            if (form is null) return label;
            if (pack.Forms.TryGetValue(qid, out var byLanguage)
                && byLanguage.TryGetValue(language, out var forms)
                && forms.TryGetValue(form, out var word)
                && !string.IsNullOrWhiteSpace(word))
                return word;
            return form == "def" ? label : null;
        }
    }

    /// <summary>A request the pack can't serve. Its message is shown to the author.</summary>
    public sealed class FactQuizException(string message) : Exception(message);
}
