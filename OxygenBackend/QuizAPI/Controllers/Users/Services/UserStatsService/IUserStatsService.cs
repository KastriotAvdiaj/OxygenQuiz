using QuizAPI.Common;
using QuizAPI.DTOs.Quiz;

namespace QuizAPI.Controllers.Users.Services.UserStatsService
{
    /// <summary>
    /// Read-side aggregation of a user's quiz-play statistics (profile stat cards).
    /// Query-only — this service never writes. See docs/quiz/user-stats-history.md.
    /// </summary>
    public interface IUserStatsService
    {
        Task<Result<UserQuizStatsDto>> GetUserQuizStatsAsync(Guid userId, CancellationToken ct = default);
    }
}
