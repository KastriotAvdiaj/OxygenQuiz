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
    /// preview endpoint (GET — JSON rows for an on-screen table) and an export endpoint (POST —
    /// CSV / Excel / JSON file via the shared export framework).
    ///
    /// Export takes the rows in the request body rather than re-querying. This makes the download
    /// match exactly what the user is looking at: the client applies any on-screen filtering /
    /// sorting / searching to the previewed rows and posts those, so "what you see is what you
    /// export" with no risk of the export's filters drifting from the table's. All endpoints are
    /// scoped to the current user (export only formats data the caller already fetched as themself).
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

        // Exports the exact rows the client posts (already filtered/sorted on screen), so the
        // download matches the visible table. Format comes from the query string.
        [HttpPost("quiz-performance/export")]
        public IActionResult ExportQuizPerformance(
            [FromBody] List<QuizPerformanceRow> rows, [FromQuery] string? format)
        {
            if (_currentUser.UserId is not Guid) return Unauthorized();

            DataFormatExtensions.TryParse(format, out var fmt);
            var file = _exporter.Export(rows ?? new List<QuizPerformanceRow>(), fmt, "quiz-performance");
            return File(file.Content, file.ContentType, file.FileName);
        }

        // ── Question analytics ────────────────────────────────────────────────────
        [HttpGet("question-analytics")]
        public async Task<IActionResult> QuestionAnalytics([FromQuery] ReportCriteria criteria, CancellationToken ct)
        {
            if (_currentUser.UserId is not Guid userId) return Unauthorized();
            return Ok(await _reports.GetQuestionAnalyticsAsync(userId, criteria, ct));
        }

        // Exports the exact rows the client posts (already filtered/sorted on screen), so the
        // download matches the visible table. Format comes from the query string.
        [HttpPost("question-analytics/export")]
        public IActionResult ExportQuestionAnalytics(
            [FromBody] List<QuestionAnalyticsRow> rows, [FromQuery] string? format)
        {
            if (_currentUser.UserId is not Guid) return Unauthorized();

            DataFormatExtensions.TryParse(format, out var fmt);
            var file = _exporter.Export(rows ?? new List<QuestionAnalyticsRow>(), fmt, "question-analytics");
            return File(file.Content, file.ContentType, file.FileName);
        }
    }
}
