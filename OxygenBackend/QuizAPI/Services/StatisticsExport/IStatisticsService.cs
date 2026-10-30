using QuizAPI.DTOs.Statistics;

namespace QuizAPI.Services.StatisticsExport
{
    /// <summary>
    /// Builds dynamic, criteria-driven reports scoped to a single user's own content (the quizzes
    /// and questions they created). Returns plain row lists that the controller renders for preview
    /// or hands to the export framework.
    /// </summary>
    public interface IStatisticsService
    {
        Task<List<QuizPerformanceRow>> GetQuizPerformanceAsync(Guid userId, StatisticsCriteria criteria, CancellationToken ct = default);
        Task<List<QuestionAnalyticsRow>> GetQuestionAnalyticsAsync(Guid userId, StatisticsCriteria criteria, CancellationToken ct = default);

        /// <summary>
        /// Full analytics for one quiz. Returns <c>null</c> if the quiz doesn't exist or the caller
        /// may not see it (controller maps that to 404).
        ///
        /// <paramref name="ownerId"/> is the ownership clamp, following the convention in CLAUDE.md:
        /// the caller decides *whether* someone may act, this decides *on which rows*. Pass the
        /// caller's id to restrict to their own quizzes, or <c>null</c> for an admin who may read
        /// any quiz's analytics.
        /// </summary>
        Task<QuizAnalyticsDto?> GetQuizAnalyticsAsync(Guid? ownerId, int quizId, StatisticsCriteria criteria, CancellationToken ct = default);
    }
}
