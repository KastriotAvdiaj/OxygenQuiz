using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Filtering;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Services.Interfaces;

namespace QuizAPI.Controllers;

/// <summary>
/// Reads of played matches: the review inside a lobby, and the multiplayer side of the history
/// page. See docs/quiz/multiplayer.md §7.6.
///
/// <para>Controller → repository, with no service between them: there is no rule here that is
/// neither the HTTP shape nor the query. Who may read what is the repository's clamp — every read
/// is "matches <i>the caller</i> played in" — so neither action can be asked about anyone else.</para>
/// </summary>
[ApiController]
[Authorize]
[Route("api/matches")]
public class MatchesController : BaseApiController
{
    private readonly IMatchRepository _matches;
    private readonly IQuizSessionManager _lobbies;
    private readonly ICurrentUserService _currentUser;

    public MatchesController(IMatchRepository matches, IQuizSessionManager lobbies, ICurrentUserService currentUser)
    {
        _matches = matches;
        _lobbies = lobbies;
        _currentUser = currentUser;
    }

    /// <summary>
    /// The matches played so far in the lobby with this room code that the caller took part in,
    /// oldest first.
    ///
    /// <para><b>By room code, though matches are grouped by lobby id.</b> The code is what the
    /// client has, and while a lobby is open it names exactly one lobby; the id it stands for is
    /// looked up here and never leaves the server. Once the lobby is gone the code means nothing —
    /// it may already belong to someone else's lobby — so this answers 404 and the history page
    /// is where those matches are found.</para>
    ///
    /// <para>Read from the database, not from the lobby's memory, which is why it survives a
    /// reconnect: a player who dropped out and came back asks again and gets the same list.</para>
    /// </summary>
    [HttpGet("lobby/{roomCode}")]
    [ProducesResponseType(typeof(IReadOnlyList<MatchSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLobbyMatches(string roomCode, CancellationToken ct)
    {
        var userId = _currentUser.UserId;
        if (userId is null) return Unauthorized();

        var lobby = await _lobbies.GetSessionAsync(roomCode);
        if (lobby is null) return NotFound();

        return Ok(await _matches.ListForLobbyAsync(lobby.LobbyId, userId.Value, ct));
    }

    /// <summary>The caller's multiplayer history, one entry per lobby, most recently played first.</summary>
    [HttpGet("mine")]
    [ProducesResponseType(typeof(PagedResponse<LobbyHistoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyLobbies(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId;
        if (userId is null) return Unauthorized();

        return Ok(await _matches.ListLobbiesForUserAsync(userId.Value, page, pageSize, ct));
    }
}
