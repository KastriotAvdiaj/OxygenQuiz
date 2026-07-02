using QuizAPI.DTOs.Quiz;
using QuizAPI.ManyToManyTables;

namespace QuizAPI.Controllers.Quizzes.Services.QuizServices
{
    /// <summary>
    /// Pure copy-on-write diff between a quiz's live question rows and the incoming edit
    /// (see docs/quiz-editing.md). Live rows are never mutated in place:
    ///
    ///   - question dropped from the quiz      → retire the row (stamp RemovedInVersion)
    ///   - question's settings/order changed   → retire the row AND insert a replacement
    ///   - question newly added                → insert a row (CreatedInVersion = new version)
    ///   - question untouched                  → row left alone
    ///
    /// This keeps every QuizQuestion id that an in-flight session or a historical UserAnswer
    /// references valid forever, while new sessions only see rows live in the new version.
    /// Kept free of EF/DbContext so the algorithm is unit-testable in isolation.
    /// </summary>
    public static class QuizQuestionVersioning
    {
        public sealed record DiffResult(
            IReadOnlyList<QuizQuestion> ToRetire,
            IReadOnlyList<QuizQuestion> ToAdd)
        {
            public bool HasQuestionChanges => ToRetire.Count > 0 || ToAdd.Count > 0;
        }

        /// <summary>
        /// Computes the row operations that turn <paramref name="liveRows"/> into
        /// <paramref name="incoming"/> at <paramref name="newVersion"/>. Rows in ToRetire must get
        /// <c>RemovedInVersion = newVersion</c>; rows in ToAdd are new entities to insert.
        /// Incoming order is normalised server-side to 1..n by list position (same as create).
        /// </summary>
        /// <exception cref="InvalidOperationException">A question id appears twice.</exception>
        public static DiffResult Diff(
            IEnumerable<QuizQuestion> liveRows,
            IReadOnlyCollection<QuizQuestionUM> incoming,
            int quizId,
            int newVersion)
        {
            // Normalise order: trust the client's relative ordering, not its absolute numbers.
            var normalised = incoming
                .OrderBy(q => q.OrderInQuiz)
                .Select((um, index) => (um, Order: index + 1))
                .ToList();

            var byQuestionId = new Dictionary<int, (QuizQuestionUM um, int Order)>();
            foreach (var entry in normalised)
            {
                if (!byQuestionId.TryAdd(entry.um.QuestionId, entry))
                    throw new InvalidOperationException(
                        $"Question {entry.um.QuestionId} appears more than once in the quiz.");
            }

            var toRetire = new List<QuizQuestion>();
            var toAdd = new List<QuizQuestion>();

            foreach (var row in liveRows.Where(r => r.IsLive))
            {
                if (!byQuestionId.TryGetValue(row.QuestionId, out var entry))
                {
                    // Removed from the quiz.
                    toRetire.Add(row);
                    continue;
                }

                var pointSystem = ParsePointSystem(entry.um.PointSystem);
                var unchanged = row.TimeLimitInSeconds == entry.um.TimeLimitInSeconds
                                && row.PointSystem == pointSystem
                                && row.OrderInQuiz == entry.Order;

                if (!unchanged)
                {
                    // Copy-on-write: retire the old configuration, insert the new one.
                    toRetire.Add(row);
                    toAdd.Add(NewRow(quizId, entry.um, entry.Order, newVersion));
                }

                byQuestionId.Remove(row.QuestionId); // handled
            }

            // Whatever is left in the dictionary is genuinely new to the quiz.
            foreach (var entry in byQuestionId.Values.OrderBy(e => e.Order))
                toAdd.Add(NewRow(quizId, entry.um, entry.Order, newVersion));

            return new DiffResult(toRetire, toAdd);
        }

        private static QuizQuestion NewRow(int quizId, QuizQuestionUM um, int order, int newVersion) => new()
        {
            QuizId = quizId,
            QuestionId = um.QuestionId,
            TimeLimitInSeconds = um.TimeLimitInSeconds,
            PointSystem = ParsePointSystem(um.PointSystem),
            OrderInQuiz = order,
            CreatedInVersion = newVersion,
            RemovedInVersion = null
        };

        private static PointSystem ParsePointSystem(string raw) =>
            Enum.TryParse<PointSystem>(raw, ignoreCase: true, out var ps) ? ps : PointSystem.Standard;
    }
}
