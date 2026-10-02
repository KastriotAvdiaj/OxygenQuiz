using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Common;
using QuizAPI.DTOs.Classroom;
using QuizAPI.Models.Quiz;
using QuizAPI.Services.Classroom;
using QuizAPI.Services.CurrentUserService;

namespace QuizAPI.Controllers.Classroom
{
    /// <summary>
    /// Host mode (docs/quiz/classroom.md): the Controller's API. Teacher-only; every game is
    /// clamped to its host in the repository, so another Teacher's id is a 404. The Associations
    /// preview gate applies too — a Teacher can see the format, but the rule stays in one place.
    /// Live updates to Displays go over <c>HostedGameHub</c>.
    /// </summary>
    [ApiController]
    [Authorize(Roles = "Teacher")]
    [Route("api/hosted-games")]
    public class HostedGamesController : ControllerBase
    {
        private readonly IHostedGameService _games;
        private readonly ICurrentUserService _current;

        public HostedGamesController(IHostedGameService games, ICurrentUserService current)
        {
            _games = games;
            _current = current;
        }

        private Guid HostId => _current.UserId ?? throw new InvalidOperationException("User ID not found or invalid");
        private bool MayUseAssociations => QuizFormatAccess.IsAvailableTo(QuizFormat.Associations, _current.CanSeePreviewFormats);

        [HttpPost]
        public async Task<ActionResult<HostedGameViewDTO>> Start([FromBody] StartHostedGameRequest request)
        {
            if (!MayUseAssociations) return NotFound();
            var view = await _games.StartAsync(HostId, request);
            return Created($"/api/hosted-games/{view.Id}", view);
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<HostedGameSummaryDTO>>> List() => Ok(await _games.ListAsync(HostId));

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<HostedGameViewDTO>> Get(Guid id) => Ok(await _games.GetAsync(id, HostId));

        [HttpPost("{id:guid}/open")]
        public async Task<ActionResult<HostedMoveResultDTO>> Open(Guid id, [FromBody] HostedOpenRequest request) =>
            Ok(await _games.OpenAsync(id, HostId, request.TileId));

        [HttpPost("{id:guid}/guess")]
        public async Task<ActionResult<HostedMoveResultDTO>> Guess(Guid id, [FromBody] HostedGuessRequest request) =>
            Ok(await _games.GuessAsync(id, HostId, request.Target, request.Text));

        [HttpPost("{id:guid}/pass")]
        public async Task<ActionResult<HostedMoveResultDTO>> Pass(Guid id) => Ok(await _games.PassAsync(id, HostId));

        [HttpPost("{id:guid}/undo")]
        public async Task<ActionResult<HostedGameViewDTO>> Undo(Guid id) => Ok(await _games.UndoAsync(id, HostId));

        [HttpPost("{id:guid}/pause")]
        public async Task<ActionResult<HostedGameViewDTO>> Pause(Guid id) => Ok(await _games.PauseAsync(id, HostId));

        [HttpPost("{id:guid}/resume")]
        public async Task<ActionResult<HostedGameViewDTO>> Resume(Guid id) => Ok(await _games.ResumeAsync(id, HostId));

        [HttpPost("{id:guid}/end")]
        public async Task<ActionResult<HostedGameViewDTO>> End(Guid id) => Ok(await _games.EndAsync(id, HostId));

        [HttpPost("{id:guid}/again")]
        public async Task<ActionResult<HostedGameViewDTO>> Again(Guid id, [FromBody] PlayHostedGameAgainRequest request)
        {
            if (!MayUseAssociations) return NotFound();
            var view = await _games.PlayAgainAsync(id, HostId, request);
            return Created($"/api/hosted-games/{view.Id}", view);
        }

        [HttpPost("{id:guid}/screen-code")]
        public async Task<ActionResult<HostedGameViewDTO>> ScreenCode(Guid id) => Ok(await _games.IssueScreenCodeAsync(id, HostId));

        [HttpDelete("{id:guid}/screens")]
        public async Task<ActionResult<HostedGameViewDTO>> DisconnectScreens(Guid id) => Ok(await _games.DisconnectScreensAsync(id, HostId));
    }
}
