using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Middleware;

namespace QuizAPI.Controllers;

/// <summary>
/// Anonymous singleplayer quiz play for visitors without an account. See docs/auth/guest-play.md for
/// the full design: one free quiz per browser (a soft, cookie-based limit — not a hard security
/// boundary), nothing is persisted past the results page, and multiplayer stays fully gated
/// behind login (enforced separately by <c>QuizHub</c>'s <c>[Authorize]</c>).
///
/// Every route here re-checks <c>IsGuestSessionAsync</c> before touching a session, so this
/// anonymous surface can only ever read/write sessions that were themselves created as guest
/// sessions — it can't be used to reach a real user's session by guessing its id.
/// </summary>
[ApiController]
[Route("api/guest-quiz-sessions")]
public class GuestQuizSessionsController : BaseApiController
{
    private const string GuestPlayedCookieName = "guest_played";

    private readonly IQuizSessionService _quizSessionService;

    public GuestQuizSessionsController(IQuizSessionService quizSessionService)
    {
        _quizSessionService = quizSessionService;
    }

    /// <summary>Whether this browser still has its free guest quiz available.</summary>
    [HttpGet("can-play")]
    public IActionResult CanPlay()
    {
        var alreadyPlayed = Request.Cookies.ContainsKey(GuestPlayedCookieName);
        return Ok(new { canPlay = !alreadyPlayed });
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitingExtensions.GuestPolicy)]
    [ProducesResponseType(typeof(QuizSessionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateGuestSession([FromBody] GuestQuizSessionCM model)
    {
        if (Request.Cookies.ContainsKey(GuestPlayedCookieName))
            return Forbid();

        var result = await _quizSessionService.CreateGuestSessionAsync(model.QuizId);
        if (!result.IsSuccess) return HandleResult(result);

        return CreatedAtAction(nameof(GetCurrentState), new { sessionId = result.Data!.Id }, result.Data);
    }

    [HttpGet("{sessionId:guid}/current-state")]
    [ProducesResponseType(typeof(QuizStateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentState(Guid sessionId)
    {
        if (!await _quizSessionService.IsGuestSessionAsync(sessionId)) return NotFound();

        var result = await _quizSessionService.GetCurrentStateAsync(sessionId);
        return HandleResult(result);
    }

    [HttpGet("{sessionId:guid}/next-question")]
    [ProducesResponseType(typeof(CurrentQuestionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetNextQuestion(Guid sessionId)
    {
        if (!await _quizSessionService.IsGuestSessionAsync(sessionId)) return NotFound();

        var result = await _quizSessionService.GetNextQuestionAsync(sessionId);
        return HandleResult(result);
    }

    [HttpPost("answer")]
    [ProducesResponseType(typeof(InstantFeedbackAnswerResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SubmitAnswer([FromBody] UserAnswerCM model)
    {
        if (!await _quizSessionService.IsGuestSessionAsync(model.SessionId)) return NotFound();

        var result = await _quizSessionService.SubmitAnswerAsync(model);
        return HandleResult(result);
    }

    [HttpPost("{sessionId:guid}/complete")]
    [ProducesResponseType(typeof(QuizSessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CompleteSession(Guid sessionId)
    {
        if (!await _quizSessionService.IsGuestSessionAsync(sessionId)) return NotFound();

        var result = await _quizSessionService.CompleteSessionAsync(sessionId);
        return HandleResult(result);
    }

    [HttpGet("{sessionId:guid}/results")]
    [ProducesResponseType(typeof(QuizSessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSessionResults(Guid sessionId, [FromQuery] int maxWaitSeconds = 30)
    {
        if (!await _quizSessionService.IsGuestSessionAsync(sessionId)) return NotFound();

        var result = await _quizSessionService.GetSessionWithGradedAnswersAsync(sessionId, maxWaitSeconds);
        return HandleResult(result);
    }

    /// <summary>
    /// Call once the guest has seen their results. Permanently deletes the session and its
    /// answers, and sets the cookie that spends this browser's one free guest quiz.
    /// </summary>
    [HttpPost("{sessionId:guid}/finish")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Finish(Guid sessionId)
    {
        if (!await _quizSessionService.IsGuestSessionAsync(sessionId)) return NotFound();

        var result = await _quizSessionService.DiscardGuestSessionAsync(sessionId);
        if (!result.IsSuccess) return HandleResult(result);

        Response.Cookies.Append(GuestPlayedCookieName, "1", new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = DateTime.UtcNow.AddYears(1),
        });

        return NoContent();
    }
}
