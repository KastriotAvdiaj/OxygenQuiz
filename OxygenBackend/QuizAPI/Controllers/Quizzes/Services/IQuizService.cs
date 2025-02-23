using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services
{
    public interface IQuizService
    {
        Task<Quiz> CreateQuizAsync(QuizCM quizCM, string userId);

        /*Task<QuizDTO> GetQuizzesAsync();*/
        Task<bool> ValidatePublicQuestionsAsync(IEnumerable<int> questionIds);
       /* Task<bool> ValidateQuizSlugAsync(string slug);*/
    }
}
