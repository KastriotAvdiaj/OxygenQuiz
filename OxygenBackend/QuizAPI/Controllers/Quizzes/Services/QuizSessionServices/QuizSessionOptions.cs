namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public class QuizSessionOptions
    {
        public const string SectionName = "QuizSession";

        public double GracePeriodSeconds { get; set; } = 0;
        public int QuestionBufferSeconds { get; set; } = 5;
        public double TotalTimeoutBufferPercentage { get; set; } = 0.5;
        public double ActivityTimeoutMultiplier { get; set; } = 2.0;
        public int ActivityBufferSeconds { get; set; } = 60;
        public int DefaultMaxQuestionTimeSeconds { get; set; } = 300;
        public int MaxConcurrentSessionsPerUser { get; set; } = 1;

        /// <summary>
        /// How often the background sweep looks for sessions that have gone stale. Set to 0 (or
        /// less) to disable the sweep entirely, which leaves abandonment happening only on the
        /// lazy paths — when the player comes back to the quiz, or on resume.
        ///
        /// Five minutes rather than something tighter because nothing is waiting on the result:
        /// a session that went stale is stale whether it is marked now or in four minutes, and
        /// the sweep walks every incomplete session each pass.
        /// </summary>
        public int AbandonmentSweepMinutes { get; set; } = 5;

        /// <summary>
        /// Ceiling on how much network latency the server will credit back when a client reports
        /// its own think time (<c>UserAnswerCM.ClientElapsedMs</c>). A client-reported elapsed is
        /// only believed when the server-measured window exceeds it by at most this many seconds;
        /// otherwise scoring falls back to the server window. See <c>Services/Scoring/QuizTiming</c>.
        /// </summary>
        public double MaxLatencyCreditSeconds { get; set; } = 2.0;
    }
}
