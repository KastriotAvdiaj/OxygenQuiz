using System.Globalization;
using System.Text;
using QuizAPI.Models;

namespace QuizAPI.Services.Grading
{
    /// <summary>
    /// The single source of truth for whether a typed answer is correct.
    ///
    /// Three call sites used to decide this independently — the live grader
    /// (<c>AnswerGradingService</c>, which both singleplayer and multiplayer route through) and the
    /// question preview (<c>TestQuestionService</c>). They had drifted: neither honoured
    /// <see cref="TypeTheAnswerQuestion.AllowPartialMatch"/> at all, despite the builder showing a
    /// switch that promises it. Anything that changes what counts as correct belongs here, so
    /// "test this question" can never disagree with playing it for real.
    ///
    /// Deliberately pure and stateless: no database, no clock, no logging — which is what makes it
    /// cheap to unit-test, and correctness of grading is exactly the thing worth testing.
    ///
    /// See docs/quiz/typed-answer-matching.md.
    /// </summary>
    public static class TypeTheAnswerMatcher
    {
        /// <summary>
        /// Articles stripped from the front of an answer during normalisation. Deliberately short
        /// and only leading — "the Beatles" and "Beatles" are the same answer, but a word like
        /// "the" in the *middle* of an answer is carrying meaning ("Lord of the Rings") and must
        /// survive. Covers the languages currently seeded; add to it as the catalog grows.
        /// </summary>
        private static readonly string[] LeadingArticles =
            { "the", "a", "an", "le", "la", "les", "el", "los", "las", "der", "die", "das", "un", "une" };

        /// <summary>
        /// True when <paramref name="submitted"/> should be accepted for <paramref name="question"/>.
        ///
        /// Order of operations:
        ///   1. **Normalise** both sides (see <see cref="Normalise"/>). Always on, no toggle —
        ///      a player who types "Café" for "Cafe", or a stray double space, has not given a
        ///      wrong answer, and there's no reason to make an author opt into forgiving that.
        ///   2. **Exact match** against the normalised <c>CorrectAnswer</c>, then each
        ///      <c>AcceptableAnswers</c> entry.
        ///   3. Only if <c>AllowPartialMatch</c> is on, **whole-word containment**: the expected
        ///      answer appearing as a complete word (or run of words) inside what the player typed.
        ///
        /// Empty input is never correct, even under partial match — every string contains the empty
        /// string, so without this guard an empty submission would match everything.
        /// </summary>
        public static bool IsCorrect(TypeTheAnswerQuestion question, string? submitted)
        {
            if (question is null) return false;

            var caseSensitive = question.IsCaseSensitive;

            var answer = Normalise(submitted, caseSensitive);
            if (answer.Length == 0) return false;

            var expectedAnswers = Expected(question, caseSensitive);

            foreach (var expected in expectedAnswers)
            {
                if (string.Equals(expected, answer, StringComparison.Ordinal))
                    return true;
            }

            if (!question.AllowPartialMatch)
                return false;

            // "the Eiffel Tower" is accepted when the expected answer is "Eiffel".
            //
            // One-directional on purpose: typing "Eiff" for "Eiffel" stays wrong, because accepting
            // prefixes of the answer would let a player guess a letter at a time.
            foreach (var expected in expectedAnswers)
            {
                if (ContainsAsWords(answer, expected))
                    return true;
            }

            return false;
        }

        /// <summary>
        /// Whole-word containment: is <paramref name="expected"/> present in
        /// <paramref name="haystack"/> as a complete word or run of words?
        ///
        /// This replaced a raw <c>string.Contains</c>, which had no notion of word boundaries and
        /// so accepted "concatenate" for "cat", "Bart" for "art" and "13" for "3". With partial
        /// match on, that made short answers guessable by typing a long enough sentence.
        ///
        /// Both inputs are already normalised, so tokens are single-space separated.
        ///
        /// **Scripts without spaces** (Chinese, Japanese, Thai …) normalise to a single token, and
        /// word-boundary matching would be meaningless there — for those, substring containment is
        /// the correct behaviour, so a single-token expected answer falls back to it. That keeps
        /// partial match working for those languages at the cost of the "cat"/"concatenate" problem
        /// remaining *within* a token, which is unavoidable without per-language segmentation.
        /// </summary>
        private static bool ContainsAsWords(string haystack, string expected)
        {
            if (expected.Length == 0) return false;

            var expectedTokens = expected.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var haystackTokens = haystack.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            if (expectedTokens.Length == 0) return false;

            // Space-less script (or a single word that is itself the whole answer): the token split
            // tells us nothing, so fall back to substring within the single token.
            if (expectedTokens.Length == 1 && haystackTokens.Length == 1)
                return haystackTokens[0].Contains(expectedTokens[0], StringComparison.Ordinal);

            if (expectedTokens.Length > haystackTokens.Length) return false;

            // Contiguous run: "eiffel tower" must appear as adjacent words, so "eiffel is a tower"
            // does not match.
            for (var start = 0; start <= haystackTokens.Length - expectedTokens.Length; start++)
            {
                var matched = true;
                for (var offset = 0; offset < expectedTokens.Length; offset++)
                {
                    if (!string.Equals(haystackTokens[start + offset], expectedTokens[offset], StringComparison.Ordinal))
                    {
                        matched = false;
                        break;
                    }
                }
                if (matched) return true;
            }

            return false;
        }

        /// <summary>
        /// Reduce an answer to the form comparisons happen on:
        ///
        ///   • trim, and collapse internal whitespace runs to one space
        ///   • strip diacritics — "Café" and "Cafe" are the same answer
        ///   • drop punctuation — "Mother's Day"/"Mothers Day", "U.S.A."/"USA"
        ///   • lower-case, unless the question is case-sensitive
        ///   • drop a single leading article
        ///
        /// Case sensitivity is honoured throughout: a case-sensitive question still normalises
        /// spacing, accents and punctuation (none of which are what "case-sensitive" means) but
        /// keeps the case. Article stripping stays case-insensitive so "The Beatles" is handled on
        /// a case-sensitive question too.
        ///
        /// Everything here is a formatting concern, which is why it is unconditional. Deciding
        /// whether an answer is *close enough* — typos — is a different question and is deliberately
        /// not done here; see docs/proposals/typed-answer-typo-tolerance.md.
        /// </summary>
        private static string Normalise(string? value, bool caseSensitive)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;

            // FormD splits "é" into "e" + combining accent, so the accents can be dropped by
            // category and the base letters kept.
            var decomposed = value.Trim().Normalize(NormalizationForm.FormD);

            var builder = new StringBuilder(decomposed.Length);
            var lastWasSpace = false;

            foreach (var ch in decomposed)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark)
                    continue; // a stripped accent

                if (char.IsWhiteSpace(ch))
                {
                    // Collapse runs, and never lead with a space.
                    if (!lastWasSpace && builder.Length > 0) builder.Append(' ');
                    lastWasSpace = true;
                    continue;
                }

                // Punctuation and symbols are dropped rather than turned into spaces, so "U.S.A."
                // becomes "usa" rather than "u s a".
                if (char.IsPunctuation(ch) || char.IsSymbol(ch))
                    continue;

                builder.Append(caseSensitive ? ch : char.ToLowerInvariant(ch));
                lastWasSpace = false;
            }

            var normalised = builder.ToString().Trim().Normalize(NormalizationForm.FormC);
            return StripLeadingArticle(normalised);
        }

        private static string StripLeadingArticle(string value)
        {
            var firstSpace = value.IndexOf(' ');
            if (firstSpace <= 0) return value; // one word — never strip it to nothing

            var firstWord = value[..firstSpace];
            foreach (var article in LeadingArticles)
            {
                if (string.Equals(firstWord, article, StringComparison.OrdinalIgnoreCase))
                    return value[(firstSpace + 1)..];
            }

            return value;
        }

        /// <summary>
        /// The accepted answers, normalised, with blanks dropped. An empty alternative would match
        /// everything under partial match, and authors do leave empty rows behind in the builder's
        /// "other accepted answers" list.
        /// </summary>
        private static List<string> Expected(TypeTheAnswerQuestion question, bool caseSensitive)
        {
            var results = new List<string>();

            var primary = Normalise(question.CorrectAnswer, caseSensitive);
            if (primary.Length > 0) results.Add(primary);

            if (question.AcceptableAnswers is null) return results;

            foreach (var alternative in question.AcceptableAnswers)
            {
                var normalised = Normalise(alternative, caseSensitive);
                if (normalised.Length > 0) results.Add(normalised);
            }

            return results;
        }
    }
}
