using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuizAPI.Exceptions;
using QuizAPI.Middleware;
using QuizAPI.Services.Ai.ScreenshotImport;
using QuizAPI.Services.Audit;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Services.Roles;

namespace QuizAPI.Controllers.Questions
{
    /// <summary>
    /// Screenshot import (docs/quiz/screenshot-import.md): Admins and SuperAdmins only, from the
    /// admin Questions page. One image per request — the client sends an import's images up to
    /// three at a time, so each image has its own status, retry and charge. Nothing here writes a
    /// question; the reviewer saves through the ordinary create endpoints.
    /// </summary>
    [Route("api/questions/screenshot-import")]
    [ApiController]
    [Authorize(Roles = "SuperAdmin, Admin")]
    public class ScreenshotImportController : ControllerBase
    {
        /// <summary>The upload pipeline's own ceiling for an image, plus room for the form.</summary>
        private const long MaxRequestBytes = 11L * 1024 * 1024;

        private readonly IScreenshotImportService _service;
        private readonly ICurrentUserService _current;
        private readonly IAuditService _audit;

        public ScreenshotImportController(
            IScreenshotImportService service, ICurrentUserService current, IAuditService audit)
        {
            _service = service;
            _current = current;
            _audit = audit;
        }

        private bool Unlimited => User.IsInRole(RoleRules.SuperAdmin);

        [HttpGet("status")]
        public async Task<ActionResult<ScreenshotImportStatus>> Status(CancellationToken ct)
        {
            var userId = _current.UserId ?? throw new ForbiddenException("Sign in first.");
            return Ok(await _service.GetStatusAsync(userId, Unlimited, ct));
        }

        [HttpPost("read")]
        [RequestSizeLimit(MaxRequestBytes)]
        [RequestFormLimits(MultipartBodyLengthLimit = MaxRequestBytes)]
        [EnableRateLimiting(RateLimitingExtensions.ScreenshotPolicy)]
        public async Task<ActionResult<ScreenshotReadResult>> Read(
            IFormFile? image, [FromForm] ScreenshotMakeType makeType, CancellationToken ct)
        {
            var userId = _current.UserId ?? throw new ForbiddenException("Sign in first.");
            if (image is null || image.Length == 0)
                throw new AppValidationException("Choose an image first.");

            byte[] bytes;
            await using (var stream = image.OpenReadStream())
            using (var ms = new MemoryStream())
            {
                await stream.CopyToAsync(ms, ct);
                bytes = ms.ToArray();
            }

            var result = await _service.ReadAsync(userId, Unlimited, bytes, makeType, ct);

            await _audit.LogAsync(
                AuditActions.ScreenshotRead, "Question", null,
                newValue: new { Questions = result.Questions.Count, MakeType = makeType.ToString() });

            return Ok(result);
        }
    }
}
