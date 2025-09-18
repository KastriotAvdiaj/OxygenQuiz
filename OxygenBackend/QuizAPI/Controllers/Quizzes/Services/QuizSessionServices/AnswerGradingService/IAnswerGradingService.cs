using QuizAPI.Common;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices
{
    public interface IAnswerGradingService
    {
        /// <summary>
        /// Grades an answer synchronously (for instant feedback quizzes)
        /// </summary>
        Task<GradingResult> GradeAnswerAsync(int quizQuestionId, UserAnswer userAnswer, DateTime questionStartTime);

        /// <summary>
        /// Grades an answer in the background using Hangfire (for non-instant feedback quizzes)
        /// </summary>
        void EnqueueAnswerGrading(int userAnswerId, DateTime questionStartTime);

        /// <summary>
        /// Background job method called by Hangfire - should be public for Hangfire to invoke
        /// </summary>
        Task ProcessAnswerGradingAsync(int userAnswerId, DateTime questionStartTime);

        /// <summary>
        /// Checks if all answers for a session have been graded
        /// </summary>
        Task<bool> AreAllAnswersGradedAsync(Guid sessionId);

        /// <summary>
        /// Gets grading status for a session
        /// </summary>
        Task<SessionGradingStatus> GetSessionGradingStatusAsync(Guid sessionId);
    }

    public class GradingResult
    {
        public bool IsCorrect { get; set; }
        public int Score { get; set; }
        public AnswerStatus Status { get; set; }
    }

    public class SessionGradingStatus
    {
        public int TotalAnswers { get; set; }
        public int GradedAnswers { get; set; }
        public bool IsGradingComplete => TotalAnswers == GradedAnswers && TotalAnswers > 0;
        public decimal PercentageComplete => TotalAnswers > 0 ? (decimal)GradedAnswers / TotalAnswers * 100 : 0;
    }
}