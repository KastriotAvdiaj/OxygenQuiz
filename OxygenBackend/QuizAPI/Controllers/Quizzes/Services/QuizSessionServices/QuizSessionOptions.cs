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
        /// Ceiling on how much network latency the server will credit back when a client reports
        /// its own think time (<c>UserAnswerCM.ClientElapsedMs</c>). A client-reported elapsed is
        /// only believed when the server-measured window exceeds it by at most this many seconds;
        /// otherwise scoring falls back to the server window. See <c>Services/Scoring/QuizTiming</c>.
        /// </summary>
        public double MaxLatencyCreditSeconds { get; set; } = 2.0;
    }
}
