using QuizAPI.DTOs.Question;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Questions.Services
{
    public interface IQuestionService
    {
        Task<Question> CreateQuestionAsync(QuestionCM newQuestionCM);
    }
}
