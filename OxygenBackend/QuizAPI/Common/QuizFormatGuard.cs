using QuizAPI.Exceptions;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Common
{
    /// <summary>
    /// The one place a Classic entry point asks "is this quiz one I can handle?".
    ///
    /// <para><b>Why a guard at all.</b> An Associations quiz has <b>zero</b> <c>QuizQuestion</c>
    /// rows, and much Classic code reads zero as a state rather than an error: a session with
    /// nothing to serve completes at once, a completion check compares an answer count against 0,
    /// an update recomputes the quiz's time as the sum of no questions and silently wipes the board
    /// time. So every Classic entry point refuses a non-Classic quiz up front, with one message,
    /// instead of each discovering the problem somewhere downstream.</para>
    ///
    /// <para>The checklist of guarded entry points is in docs/quiz/associations.md ("Classic entry
    /// points refuse other formats"). A new Classic entry point that serves or edits a quiz belongs
    /// on it.</para>
    /// </summary>
    public static class QuizFormatGuard
    {
        /// <summary>
        /// The refusal every Classic path gives. Worded for the person who will actually see it —
        /// someone who reached a Classic screen with a quiz of another format — rather than for a
        /// developer.
        /// </summary>
        public static string NotClassicMessage(QuizFormat format) =>
            $"This is {Describe(format)} quiz, and it can't be played or edited as a regular quiz.";

        /// <summary>Throws <see cref="AppValidationException"/> (→ 400) unless the quiz is Classic.</summary>
        public static void EnsureClassic(QuizFormat format)
        {
            if (format != QuizFormat.Classic)
                throw new AppValidationException(NotClassicMessage(format));
        }

        /// <summary>Throws <see cref="AppValidationException"/> (→ 400) unless the quiz is <paramref name="expected"/>.</summary>
        public static void EnsureFormat(QuizFormat actual, QuizFormat expected)
        {
            if (actual != expected)
                throw new AppValidationException(
                    $"This is {Describe(actual)} quiz, not {Describe(expected)} quiz.");
        }

        private static string Describe(QuizFormat format) => format switch
        {
            QuizFormat.Classic => "a regular",
            QuizFormat.Associations => "an Associations",
            _ => "an unsupported",
        };
    }
}
