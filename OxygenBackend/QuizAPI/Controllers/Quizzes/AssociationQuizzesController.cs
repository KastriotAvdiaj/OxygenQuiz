using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Common;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Services.Associations;
using QuizAPI.Services.Audit;
using QuizAPI.Services.CurrentUserService;

namespace QuizAPI.Controllers.Quizzes
{
    /// <summary>
    /// Authoring endpoints for Associations quizzes (docs/quiz/associations.md, "Authoring").
    /// Under <c>api/quiz</c> next to the Classic ones, because the resource is still a quiz; status,
    /// share link and delete are the Classic endpoints, which are format-agnostic.
    ///
    /// Domain errors are typed exceptions (AppValidationException → 400, ConflictException → 409)
    /// and reach the client through GlobalExceptionHandler; nothing here catches them.
    ///
    /// <para><b>Admins only while the format is in preview</b> (<see cref="QuizFormatAccess"/>).
    /// Anyone else gets 404 from every endpoint — the feature doesn't exist for them, the same way
    /// the admin dashboard answers non-admins (docs/quiz/associations.md, "Admins only, for now").
    /// Checked here, in the controller: "may this caller act" is a controller decision (CLAUDE.md).</para>
    /// </summary>
    [ApiController]
    [Route("api/quiz")]
    public class AssociationQuizzesController : BaseApiController
    {
        private readonly IAssociationBoardService _boards;
        private readonly ICurrentUserService _currentUser;
        private readonly IAuditService _audit;

        public AssociationQuizzesController(
            IAssociationBoardService boards,
            ICurrentUserService currentUser,
            IAuditService audit)
        {
            _boards = boards;
            _currentUser = currentUser;
            _audit = audit;
        }

        /// <summary>Create an Associations quiz with its Board, atomically.</summary>
        [HttpPost("associations")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Create([FromBody] AssociationQuizCM cm)
        {
            if (!MayUseAssociations) return NotFound();
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var created = await _boards.CreateAsync(GetCurrentUserId(), cm);

            await _audit.LogAsync(
                AuditActions.QuizCreated, "Quiz", created.Id.ToString(),
                newValue: new { created.Id, Format = created.Format });

            return Created($"/api/quiz/{created.Id}", created);
        }

        /// <summary>
        /// The full Board, solutions included, for the builder. Owner or admin only — it is the
        /// answer key. Anyone else gets 404, as if the quiz didn't exist.
        /// </summary>
        [HttpGet("{id:int}/board")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetBoard(int id)
        {
            if (!MayUseAssociations) return NotFound();
            var board = await _boards.GetForEditAsync(id, _currentUser.UserId, _currentUser.IsAdmin);
            return board is null ? NotFound() : Ok(board);
        }

        /// <summary>Update an Associations quiz. 409 when <c>version</c> is stale.</summary>
        [HttpPut("associations")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Update([FromBody] AssociationQuizUM um)
        {
            if (!MayUseAssociations) return NotFound();
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var updated = await _boards.UpdateAsync(GetCurrentUserId(), um);
            if (updated is null) return NotFound();

            await _audit.LogAsync(AuditActions.QuizUpdated, "Quiz", um.Id.ToString());
            return Ok(updated);
        }

        private bool MayUseAssociations =>
            QuizFormatAccess.IsAvailableTo(Models.Quiz.QuizFormat.Associations, _currentUser.IsAdmin);

        // [Authorize] guarantees a user; a missing id is a server fault, not a client one.
        private Guid GetCurrentUserId() =>
            _currentUser.UserId ?? throw new InvalidOperationException("User ID not found or invalid");
    }
}
