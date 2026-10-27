using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.DTOs.Moderation;
using QuizAPI.Exceptions;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Services.Moderation;
using QuizAPI.Services.Permissions;

namespace QuizAPI.Controllers.Moderation
{
    /// <summary>The permissions moderation adds (seeded to Admin and SuperAdmin).</summary>
    public static class ModerationPermissions
    {
        public const string Manage = "moderation:manage";
        public const string Pick = "quiz:pick";
        /// <summary>Not checked here — at quiz creation and edit (<see cref="QuizAPI.Common.QuizHouse"/>).</summary>
        public const string AutoPick = QuizAPI.Common.QuizHouse.AutoPickPermission;
    }

    /// <summary>
    /// Reports from viewers, and authors' answers to them (docs/media/moderation.md). Signed-in only:
    /// a guest report has no one to hold to it.
    /// </summary>
    [ApiController]
    [Route("api/reports")]
    [Authorize]
    public sealed class ContentReportsController(IContentReportService reports, ICurrentUserService current) : ControllerBase
    {
        private Guid UserId => current.UserId ?? throw new UnauthorizedException("Sign in to report.");

        /// <summary>Report a question or a quiz. One open report per person per item.</summary>
        [HttpPost]
        public async Task<ActionResult<ReportReceiptDTO>> Submit([FromBody] SubmitReportCM cm, CancellationToken ct) =>
            StatusCode(StatusCodes.Status201Created, await reports.SubmitAsync(UserId, cm, ct));

        /// <summary>Open wrong-answer reports on the caller's own questions and quizzes.</summary>
        [HttpGet("received")]
        public async Task<ActionResult<List<ReportTargetDTO>>> Received(CancellationToken ct) =>
            Ok(await reports.ListReceivedAsync(UserId, ct));

        /// <summary>Answer them: Fixed, or Not a mistake with a reason. Reporters are told.</summary>
        [HttpPost("respond")]
        public async Task<ActionResult> Respond([FromBody] RespondToReportsCM cm, CancellationToken ct) =>
            Ok(new { resolved = await reports.RespondAsync(UserId, cm, ct) });
    }

    /// <summary>
    /// The admin report page's data and every action on it. Permission checks here; the service
    /// decides on which rows (CLAUDE.md, "Permission checks in the controller").
    /// </summary>
    [ApiController]
    [Route("api/moderation")]
    [Authorize]
    public sealed class ModerationController(
        IModerationService moderation, IPermissionService permissions, ICurrentUserService current) : ControllerBase
    {
        private async Task<Guid> RequireAsync(string permission)
        {
            var userId = current.UserId ?? throw new UnauthorizedException("Sign in.");
            if (!await permissions.HasPermissionAsync(userId, permission))
                throw new ForbiddenException("You don't have permission to moderate.");
            return userId;
        }

        /// <summary>One lane: Urgent, NeedsAttention, WithAuthor or Resolved.</summary>
        [HttpGet("reports")]
        public async Task<ActionResult<List<ReportTargetDTO>>> Lane([FromQuery] string lane = "Urgent", CancellationToken ct = default)
        {
            await RequireAsync(ModerationPermissions.Manage);
            if (!Enum.TryParse<ReportLane>(lane, true, out var parsed))
                throw new AppValidationException("Unknown lane.");
            return Ok(await moderation.ListLaneAsync(parsed, ct));
        }

        /// <summary>How many targets wait in each open lane — the tab badges.</summary>
        [HttpGet("reports/counts")]
        public async Task<ActionResult<Dictionary<string, int>>> Counts(CancellationToken ct)
        {
            await RequireAsync(ModerationPermissions.Manage);
            return Ok(await moderation.LaneCountsAsync(ct));
        }

        [HttpPost("resolve")]
        public async Task<ActionResult> Resolve([FromBody] ResolveReportsCM cm, CancellationToken ct)
        {
            var me = await RequireAsync(ModerationPermissions.Manage);
            return Ok(new { resolved = await moderation.ResolveAsync(me, cm, ct) });
        }

        [HttpPost("questions/{id:int}/hide-media")]
        public async Task<IActionResult> HideMedia(int id, CancellationToken ct)
        {
            await moderation.SetMediaHiddenAsync(await RequireAsync(ModerationPermissions.Manage), id, true, ct);
            return NoContent();
        }

        [HttpPost("questions/{id:int}/show-media")]
        public async Task<IActionResult> ShowMedia(int id, CancellationToken ct)
        {
            await moderation.SetMediaHiddenAsync(await RequireAsync(ModerationPermissions.Manage), id, false, ct);
            return NoContent();
        }

        [HttpPost("quizzes/{id:int}/hold")]
        public async Task<IActionResult> Hold(int id, CancellationToken ct)
        {
            await moderation.SetQuizHeldAsync(await RequireAsync(ModerationPermissions.Manage), id, true, ct);
            return NoContent();
        }

        [HttpPost("quizzes/{id:int}/release")]
        public async Task<IActionResult> Release(int id, CancellationToken ct)
        {
            await moderation.SetQuizHeldAsync(await RequireAsync(ModerationPermissions.Manage), id, false, ct);
            return NoContent();
        }

        /// <summary>Remove a file everywhere and block re-upload. Not undoable.</summary>
        [HttpPost("media/{assetId:guid}/remove")]
        public async Task<IActionResult> RemoveMedia(Guid assetId, CancellationToken ct)
        {
            await moderation.RemoveMediaAsync(await RequireAsync(ModerationPermissions.Manage), assetId, ct);
            return NoContent();
        }

        [HttpPost("quizzes/{id:int}/pick")]
        public async Task<IActionResult> Pick(int id, CancellationToken ct)
        {
            await moderation.SetQuizPickedAsync(await RequireAsync(ModerationPermissions.Pick), id, true, ct);
            return NoContent();
        }

        [HttpPost("quizzes/{id:int}/unpick")]
        public async Task<IActionResult> Unpick(int id, CancellationToken ct)
        {
            await moderation.SetQuizPickedAsync(await RequireAsync(ModerationPermissions.Pick), id, false, ct);
            return NoContent();
        }
    }
}
