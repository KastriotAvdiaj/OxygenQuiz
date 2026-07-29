namespace QuizAPI.DTOs.Quiz
{
    /// <summary>
    /// Aggregate play statistics for one user, computed on read from QuizSessions/UserAnswers
    /// (no denormalised counters — see docs/quiz/user-stats-history.md for the trade-off).
    /// Guest sessions are always excluded; abandoned sessions count toward
    /// <see cref="QuizzesAbandoned"/> but not toward score/accuracy aggregates.
    /// </summary>
    public class UserQuizStatsDto
    {
        /// <summary>Completed (non-abandoned, non-guest) sessions.</summary>
        public int QuizzesPlayed { get; set; }

        /// <summary>Distinct quizzes among the completed sessions.</summary>
        public int DistinctQuizzesPlayed { get; set; }

        /// <summary>Sessions flagged with an <c>AbandonmentReason</c>.</summary>
        public int QuizzesAbandoned { get; set; }

        /// <summary>Graded answers across all counted sessions (Pending/NotAnswered excluded).</summary>
        public int TotalQuestionsAnswered { get; set; }

        public int TotalCorrectAnswers { get; set; }

        /// <summary>Correct / graded, in percent (0 when nothing graded yet).</summary>
        public double AccuracyPercent { get; set; }

        /// <summary>Mean <c>TotalScore</c> over completed sessions (high-resolution point scale).</summary>
        public double AverageScore { get; set; }

        public int BestScore { get; set; }

        /// <summary>
        /// Mean think time per answered question, in seconds. Derived from
        /// <c>SubmittedTime − QuestionStartTime</c>, which stores the latency-compensated elapsed
        /// time the answer was scored with (see docs/quiz/quiz-grading.md).
        /// </summary>
        public double AverageAnswerTimeSeconds { get; set; }

        public DateTime? LastPlayedAt { get; set; }
    }
}
