namespace QuizAPI.Models
{
    /// <summary>
    /// The rules for a type-the-answer question's alternative answers, in one place.
    ///
    /// Every write path (the standalone question endpoints, the quiz AI import, the data
    /// transfer import) funnels through <see cref="Normalize"/> so the stored list is always
    /// clean and bounded. The list is serialized to a single JSON column, so an unbounded
    /// list is unbounded row growth — and a grader that walks it on every submitted answer.
    /// The client caps the editor at <see cref="MaxCount"/> too; this is the gate, that is
    /// the fast feedback.
    /// </summary>
    public static class AcceptableAnswerRules
    {
        /// <summary>Matches the multiple-choice option cap, so both question types share one number.</summary>
        public const int MaxCount = 4;

        public static readonly string TooManyMessage =
            $"A type-the-answer question can have at most {MaxCount} acceptable answers.";

        /// <summary>
        /// Trims, drops blanks, drops anything that duplicates another entry or the correct
        /// answer, and preserves the author's ordering.
        ///
        /// Duplicate detection follows the question's own matching rule: a case-sensitive
        /// question genuinely distinguishes "york" from "York", so collapsing them there would
        /// silently delete a valid alternative.
        /// </summary>
        /// <returns>The cleaned list. Never null.</returns>
        public static List<string> Normalize(
            IEnumerable<string?>? answers, string? correctAnswer, bool isCaseSensitive)
        {
            var comparer = isCaseSensitive
                ? StringComparer.Ordinal
                : StringComparer.OrdinalIgnoreCase;

            var seen = new HashSet<string>(comparer);

            var trimmedCorrect = correctAnswer?.Trim();
            if (!string.IsNullOrEmpty(trimmedCorrect))
                seen.Add(trimmedCorrect);

            var result = new List<string>();

            foreach (var answer in answers ?? Enumerable.Empty<string?>())
            {
                if (string.IsNullOrWhiteSpace(answer)) continue;

                var trimmed = answer.Trim();
                if (seen.Add(trimmed))
                    result.Add(trimmed);
            }

            return result;
        }

        /// <summary>True when the cleaned list is over the cap.</summary>
        public static bool ExceedsCap(List<string> normalized) => normalized.Count > MaxCount;

        /// <summary>
        /// Normalize, then keep the first <see cref="MaxCount"/> entries instead of rejecting.
        ///
        /// For generated or imported content only. An author who typed a fifth answer should be
        /// told, but failing a whole quiz import because a model volunteered one synonym too many
        /// is worse than quietly keeping the best four.
        /// </summary>
        public static List<string> NormalizeAndTruncate(
            IEnumerable<string?>? answers, string? correctAnswer, bool isCaseSensitive)
        {
            var normalized = Normalize(answers, correctAnswer, isCaseSensitive);
            return normalized.Count <= MaxCount
                ? normalized
                : normalized.Take(MaxCount).ToList();
        }
    }
}
