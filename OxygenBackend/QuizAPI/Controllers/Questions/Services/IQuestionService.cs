using QuizAPI.DTOs.Question;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Questions.Services
{
    public interface IQuestionService
    {
        Task<Question> CreateQuestionAsync(
            QuestionCM newQuestionCM,
            string userId,
            int languageId,
            int categoryId,
            int difficultyId);

        Task<Question> CreateQuestionAsync(
            QuestionCM newQuestionCM,
            string userId,
            QuestionVisibility visibility);
    }
}
