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

        // ── Single-quiz analytics (individual quiz page) ──────────────────────────
        //
        // `criteria.timeZone` / `criteria.offsetMinutes` decide which calendar day each attempt
        // is counted under. They are the caller's own clock, not a permission, so there is
        // nothing to validate beyond what ReportService already does — an unrecognised zone
        // degrades to the offset and then to UTC rather than failing the request.
        [HttpGet("quiz/{quizId:int}/analytics")]
        public async Task<IActionResult> QuizAnalytics(int quizId, [FromQuery] ReportCriteria criteria, CancellationToken ct)
        {
            if (_currentUser.UserId is not Guid userId) return Unauthorized();

            // Admins read any quiz's analytics; everyone else is clamped to their own. The quiz
            // dashboard page this feeds is itself admin-gated, so without the bypass the only
            // people who could open the page were the only people guaranteed to get a 404 from it.
            var analytics = await _reports.GetQuizAnalyticsAsync(
                _currentUser.IsAdmin ? null : userId, quizId, criteria, ct);
            return analytics is null ? NotFound() : Ok(analytics);
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
