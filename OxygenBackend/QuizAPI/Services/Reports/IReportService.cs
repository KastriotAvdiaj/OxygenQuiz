using QuizAPI.DTOs.Reports;

namespace QuizAPI.Services.Reports
{
    /// <summary>
    /// Builds dynamic, criteria-driven reports scoped to a single user's own content (the quizzes
    /// and questions they created). Returns plain row lists that the controller renders for preview
    /// or hands to the export framework.
    /// </summary>
    public interface IReportService
    {
        Task<List<QuizPerformanceRow>> GetQuizPerformanceAsync(Guid userId, ReportCriteria criteria, CancellationToken ct = default);
        Task<List<QuestionAnalyticsRow>> GetQuestionAnalyticsAsync(Guid userId, ReportCriteria criteria, CancellationToken ct = default);

        /// <summary>
        /// Full analytics for one quiz the user owns. Returns <c>null</c> if the quiz doesn't exist
        /// or isn't owned by the caller (controller maps that to 404).
        /// </summary>
        Task<QuizAnalyticsDto?> GetQuizAnalyticsAsync(Guid userId, int quizId, ReportCriteria criteria, CancellationToken ct = default);
    }
}
