using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService
{
    public interface ISessionAbandonmentService
    {
        Task<bool> IsSessionAbandonedAsync(QuizSession session);

        /// <summary>
        /// The instant this session stops being resumable. <see cref="IsSessionAbandonedAsync"/>
        /// is defined as "now is past this", so the two can never disagree — which matters
        /// because this value is also sent to the client, and the "Session In Progress" screen
        /// uses it to stop offering a resume the server is about to refuse.
        /// </summary>
        Task<DateTime> GetAbandonmentDeadlineAsync(QuizSession session);
        Task<int> CleanupAbandonedSessionsAsync();
        Task<QuizSession?> GetActiveSessionForUserAsync(Guid userId, int quizId);

        Task MarkSessionsAsAbandonedAsync(List<QuizSession> sessions);
    }
}
