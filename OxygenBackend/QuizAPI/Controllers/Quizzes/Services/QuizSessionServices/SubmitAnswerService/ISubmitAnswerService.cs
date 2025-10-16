using QuizAPI.Common;
using QuizAPI.DTOs.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.SubmitAnswerService
{
    public interface ISubmitAnswerService
    {
        /// <summary>
        /// Submits a user's answer for a quiz question with instant feedback support.
        /// </summary>
        /// <param name="model">The user's answer submission data</param>
        /// <returns>Result containing feedback information if instant feedback is enabled</returns>
        Task<Result<InstantFeedbackAnswerResultDto>> SubmitAnswerAsync(UserAnswerCM model);
    }
}
