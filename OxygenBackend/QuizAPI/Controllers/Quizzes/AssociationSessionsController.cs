using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Common;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Quiz;
using QuizAPI.Services.Associations;
using QuizAPI.Services.CurrentUserService;

namespace QuizAPI.Controllers.Quizzes
{
    /// <summary>
    /// Solo play of Associations quizzes (docs/quiz/associations.md, "Playing"). Every response
    /// is a view built by <see cref="AssociationViews"/> — never a Board.
    ///
    /// <para>Domain errors are typed exceptions (NotFoundException → 404, AppValidationException →
    /// 400, ConflictException → 409) and reach the client through GlobalExceptionHandler.</para>
    ///
    /// <para><b>Admins only while the format is in preview</b> (<see cref="QuizFormatAccess"/>):
    /// anyone else gets 404 from every route, as from the authoring endpoints — except reading the
    /// review of a Duel they played (an admin may invite anyone to one). Signed-in only: guest
    /// play of Boards comes with the format's release (associations.md, "Guests").</para>
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api/associations/sessions")]
    public class AssociationSessionsController : BaseApiController
    {
        private readonly IAssociationPlayService _play;
        private readonly ICurrentUserService _currentUser;

        public AssociationSessionsController(IAssociationPlayService play, ICurrentUserService currentUser)
        {
            _play = play;
            _currentUser = currentUser;
        }

        private bool MayUseAssociations =>
            QuizFormatAccess.IsAvailableTo(QuizFormat.Associations, _currentUser.IsAdmin);

        // [Authorize] guarantees a user; the id is always the JWT's, never the request's.
        private Guid GetCurrentUserId() =>
            _currentUser.UserId ?? throw new InvalidOperationException("User ID not found or invalid");

        /// <summary>Start a Solo game. 201 for a new game; 200 when an unfinished one was found and returned (<c>resumed: true</c>).</summary>
        [HttpPost]
        [ProducesResponseType(typeof(AssociationGameViewDTO), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(AssociationGameViewDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Start([FromBody] StartAssociationGameRequest request)
        {
            if (!MayUseAssociations) return NotFound();
            var view = await _play.StartAsync(GetCurrentUserId(), request.QuizId, request.ShareToken);
            return view.Resumed ? Ok(view) : Created($"/api/associations/sessions/{view.SessionId}", view);
        }

        /// <summary>The game as it stands — also how a player resumes, and what the results page reads.</summary>
        [HttpGet("{sessionId:guid}")]
        [ProducesResponseType(typeof(AssociationGameViewDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Get(Guid sessionId)
        {
            // The one exception to the preview gate: a player an admin invited to a Duel may review
            // it (associations.md §10.6). Only their own, only a Duel — the service's call.
            if (!MayUseAssociations) return Ok(await _play.GetOwnDuelAsync(sessionId, GetCurrentUserId()));
            return Ok(await _play.GetAsync(sessionId, GetCurrentUserId(), _currentUser.IsAdmin));
        }

        [HttpPost("{sessionId:guid}/open")]
        [ProducesResponseType(typeof(AssociationMoveResultDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Open(Guid sessionId, [FromBody] OpenAssociationTileRequest request)
        {
            if (!MayUseAssociations) return NotFound();
            return Ok(await _play.OpenTileAsync(sessionId, GetCurrentUserId(), request.TileId));
        }

        [HttpPost("{sessionId:guid}/guess")]
        [ProducesResponseType(typeof(AssociationMoveResultDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Guess(Guid sessionId, [FromBody] AssociationGuessRequest request)
        {
            if (!MayUseAssociations) return NotFound();
            return Ok(await _play.GuessAsync(sessionId, GetCurrentUserId(), request.Target, request.Text));
        }

        /// <summary>Stop and reveal the Board. The points already scored stand.</summary>
        [HttpPost("{sessionId:guid}/give-up")]
        [ProducesResponseType(typeof(AssociationGameViewDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GiveUp(Guid sessionId)
        {
            if (!MayUseAssociations) return NotFound();
            return Ok(await _play.GiveUpAsync(sessionId, GetCurrentUserId()));
        }

        /// <summary>Abandon this game (if still running) and start a fresh one. Always 201.</summary>
        [HttpPost("{sessionId:guid}/restart")]
        [ProducesResponseType(typeof(AssociationGameViewDTO), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Restart(Guid sessionId, [FromBody] RestartAssociationGameRequest? request)
        {
            if (!MayUseAssociations) return NotFound();
            var view = await _play.RestartAsync(sessionId, GetCurrentUserId(), request?.ShareToken);
            return Created($"/api/associations/sessions/{view.SessionId}", view);
        }
    }
}
