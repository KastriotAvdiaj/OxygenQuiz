using QuizAPI.DTOs.Reports;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Services.Reports
{
    /// <summary>
    /// Turns a <see cref="SessionModeFilter"/> into a session predicate, in one place.
    ///
    /// <para>It is an extension rather than three copies of a ternary because every report that
    /// counts sessions has to apply the same rule, and a report that forgot would not fail — it
    /// would quietly answer a different question, with multiplayer plays folded into an author's
    /// averages (docs/quiz/multiplayer.md §7). The failure mode of this rule is a
    /// wrong number that looks right, so the rule gets one implementation.</para>
    /// </summary>
    public static class SessionModeFilterExtensions
    {
        public static IQueryable<QuizSession> WhereMode(
            this IQueryable<QuizSession> sessions, SessionModeFilter mode) => mode switch
            {
                SessionModeFilter.All => sessions,
                SessionModeFilter.Multiplayer =>
                    sessions.Where(s => s.Mode == QuizSessionMode.Multiplayer),
                // SinglePlayer, and anything unrecognised: the default is the conservative one, so
                // a filter value nobody anticipated cannot silently widen an author's numbers.
                _ => sessions.Where(s => s.Mode == QuizSessionMode.SinglePlayer),
            };
    }
}
