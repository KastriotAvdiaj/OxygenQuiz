using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.DTOs.Classroom;
using QuizAPI.Models.Classroom;
using QuizAPI.Services.Classroom;
using QuizAPI.Services.CurrentUserService;

namespace QuizAPI.Controllers.Classroom
{
    /// <summary>
    /// A user asking for the Teacher role (docs/auth/teacher-role.md §2). The rules — one open
    /// request, the wait after a decline — are <see cref="ITeacherAccessService"/>'s.
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api/teacher-access")]
    public class TeacherAccessController : ControllerBase
    {
        private readonly ITeacherAccessService _service;
        private readonly ICurrentUserService _current;

        public TeacherAccessController(ITeacherAccessService service, ICurrentUserService current)
        {
            _service = service;
            _current = current;
        }

        private Guid UserId => _current.UserId ?? throw new InvalidOperationException("User ID not found or invalid");

        /// <summary>Whether the caller is a Teacher, their latest request, and whether they may ask now.</summary>
        [HttpGet("mine")]
        public async Task<ActionResult<MyTeacherAccessDTO>> Mine(CancellationToken ct) =>
            Ok(await _service.GetMineAsync(UserId, ct));

        /// <summary>Ask for the Teacher role. 409 when already a Teacher, a request is pending, or the wait after a decline isn't over.</summary>
        [HttpPost]
        public async Task<ActionResult<MyTeacherAccessDTO>> Request([FromBody] RequestTeacherAccessDTO dto, CancellationToken ct) =>
            Ok(await _service.RequestAsync(UserId, dto, ct));
    }

    /// <summary>The Admin side: list requests, approve, decline.</summary>
    [ApiController]
    [Authorize(Roles = "Admin,SuperAdmin")]
    [Route("api/admin/teacher-requests")]
    public class TeacherRequestsAdminController : ControllerBase
    {
        private readonly ITeacherAccessService _service;
        private readonly ICurrentUserService _current;

        public TeacherRequestsAdminController(ITeacherAccessService service, ICurrentUserService current)
        {
            _service = service;
            _current = current;
        }

        private Guid UserId => _current.UserId ?? throw new InvalidOperationException("User ID not found or invalid");

        /// <summary>Requests, pending first. <c>?status=Pending|Approved|Declined</c> narrows it.</summary>
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<TeacherAccessRequestDTO>>> List([FromQuery] TeacherAccessRequestStatus? status, CancellationToken ct) =>
            Ok(await _service.ListAsync(status, ct));

        [HttpPost("{id:int}/approve")]
        public async Task<IActionResult> Approve(int id, CancellationToken ct)
        {
            await _service.ApproveAsync(id, UserId, User.IsInRole("SuperAdmin"), ct);
            return NoContent();
        }

        [HttpPost("{id:int}/decline")]
        public async Task<IActionResult> Decline(int id, [FromBody] DeclineTeacherAccessDTO dto, CancellationToken ct)
        {
            await _service.DeclineAsync(id, dto, UserId, ct);
            return NoContent();
        }
    }
}
