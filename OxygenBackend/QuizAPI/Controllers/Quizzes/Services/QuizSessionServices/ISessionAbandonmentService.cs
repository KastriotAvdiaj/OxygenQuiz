using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public interface ISessionAbandonmentService
    {
        Task<bool> IsSessionAbandonedAsync(QuizSession session);
        Task<int> CleanupAbandonedSessionsAsync();
        Task<QuizSession?> GetActiveSessionForUserAsync(Guid userId, int quizId);

        Task MarkSessionsAsAbandonedAsync(List<QuizSession> sessions);
    }
}
