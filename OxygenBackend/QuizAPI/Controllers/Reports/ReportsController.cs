using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.DTOs.Reports;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Services.DataTransfer;
using QuizAPI.Services.Reports;

namespace QuizAPI.Controllers.Reports
{
    /// <summary>
    /// Dynamic, criteria-driven reports over the signed-in user's own content. Each report has a
    /// preview endpoint (JSON rows for an on-screen table) and an export endpoint (CSV / Excel /
    /// JSON file via the shared export framework). All reports are scoped to the current user.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reports;
        private readonly IDataExportService _exporter;
        private readonly ICurrentUserService _currentUser;

        public ReportsController(
            IReportService reports,
            IDataExportService exporter,
            ICurrentUserService currentUser)
        {
            _reports = reports;
            _exporter = exporter;
            _currentUser = currentUser;
        }

        // ── Quiz performance ──────────────────────────────────────────────────────
        [HttpGet("quiz-performance")]
        public async Task<IActionResult> QuizPerformance([FromQuery] ReportCriteria criteria, CancellationToken ct)
        {
            if (_currentUser.UserId is not Guid userId) return Unauthorized();
            return Ok(await _reports.GetQuizPerformanceAsync(userId, criteria, ct));
        }

        [HttpGet("quiz-performance/export")]
        public async Task<IActionResult> ExportQuizPerformance(
            [FromQuery] ReportCriteria criteria, [FromQuery] string? format, CancellationToken ct)
        {
            if (_currentUser.UserId is not Guid userId) return Unauthorized();

            DataFormatExtensions.TryParse(format, out var fmt);
            var rows = await _reports.GetQuizPerformanceAsync(userId, criteria, ct);
            var file = _exporter.Export(rows, fmt, "quiz-performance");
            return File(file.Content, file.ContentType, file.FileName);
        }

        // ── Question analytics ────────────────────────────────────────────────────
        [HttpGet("question-analytics")]
        public async Task<IActionResult> QuestionAnalytics([FromQuery] ReportCriteria criteria, CancellationToken ct)
        {
            if (_currentUser.UserId is not Guid userId) return Unauthorized();
            return Ok(await _reports.GetQuestionAnalyticsAsync(userId, criteria, ct));
        }

        [HttpGet("question-analytics/export")]
        public async Task<IActionResult> ExportQuestionAnalytics(
            [FromQuery] ReportCriteria criteria, [FromQuery] string? format, CancellationToken ct)
        {
            if (_currentUser.UserId is not Guid userId) return Unauthorized();

            DataFormatExtensions.TryParse(format, out var fmt);
            var rows = await _reports.GetQuestionAnalyticsAsync(userId, criteria, ct);
            var file = _exporter.Export(rows, fmt, "question-analytics");
            return File(file.Content, file.ContentType, file.FileName);
        }
    }
}
