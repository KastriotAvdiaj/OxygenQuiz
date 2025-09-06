namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public class QuizSessionOptions
    {
        public const string SectionName = "QuizSession";

        public int GracePeriodSeconds { get; set; } = 2;
        public int QuestionBufferSeconds { get; set; } = 5;
        public double TotalTimeoutBufferPercentage { get; set; } = 0.5;
        public double ActivityTimeoutMultiplier { get; set; } = 2.0;
        public int ActivityBufferSeconds { get; set; } = 60;
        public int DefaultMaxQuestionTimeSeconds { get; set; } = 300;
        public int MaxConcurrentSessionsPerUser { get; set; } = 1;
    }
}
