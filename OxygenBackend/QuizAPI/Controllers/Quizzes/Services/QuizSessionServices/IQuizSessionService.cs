using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public interface IQuizSessionService
    {
        Task<QuizSession> StartQuizSessionAsync(int quizId, Guid userId);
        Task<UserAnswer> SubmitAnswerAsync(Guid sessionId, int questionId, int selectedOptionId);
        Task<int> FinishQuizSessionAsync(Guid sessionId);
    }
}   
