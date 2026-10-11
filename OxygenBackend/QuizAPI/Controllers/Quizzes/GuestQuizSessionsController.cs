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

    /// <summary>The cookie's value once the free quiz is over: results seen, session deleted.</summary>
    private const string SpentValue = "1";

    private readonly IQuizSessionService _quizSessionService;

    public GuestQuizSessionsController(IQuizSessionService quizSessionService)
    {
        _quizSessionService = quizSessionService;
    }

    /// <summary>
    /// Whether this browser still has its free guest quiz available — and, if that quiz was
    /// started but never finished, the session to carry on with.
    ///
    /// The free quiz is spent when it <b>starts</b>, not when its results are seen: until
    /// 2026-10-11 the cookie was only set by <c>/finish</c>, so leaving before the results page —
    /// even on the last question — left the browser free to start another, indefinitely. The
    /// cookie now carries the session id from the moment the session exists, which is also what
    /// makes a refresh or a dropped connection recoverable rather than the end of the only try.
    /// </summary>
    [HttpGet("can-play")]
    public async Task<IActionResult> CanPlay()
    {
        if (!Request.Cookies.TryGetValue(GuestPlayedCookieName, out var value))
            return Ok(new { canPlay = true, resumeSessionId = (Guid?)null });

        // A session id whose session is still there (the sweep deletes abandoned guest sessions,
        // /finish deletes viewed ones) can be continued. Anything else is a spent try.
        Guid? resumeSessionId =
            Guid.TryParse(value, out var sessionId) && await _quizSessionService.IsGuestSessionAsync(sessionId)
                ? sessionId
                : null;

        return Ok(new { canPlay = false, resumeSessionId });
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

        // Spent from here on (see CanPlay). The value is the session id so the same browser can
        // come back to this session, and only this one.
        SetGuestPlayedCookie(result.Data!.Id.ToString());

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

    /// <summary>
    /// Carries on with a guest session after a refresh or a lost connection: the same
    /// catch-up a signed-in player gets, so questions whose time ran out while the guest was
    /// away are timed out rather than handed back. A finished session answers with
    /// <c>isQuizComplete</c> and the client goes to the results.
    /// </summary>
    [HttpPost("{sessionId:guid}/resume")]
    [ProducesResponseType(typeof(ResumeResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Resume(Guid sessionId)
    {
        if (!await _quizSessionService.IsGuestSessionAsync(sessionId)) return NotFound();

        var result = await _quizSessionService.ResolveAndResumeGuestAsync(sessionId);
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
    /// answers, and turns the cookie from "this session" into "spent" — there is no longer a
    /// session to come back to.
    /// </summary>
    [HttpPost("{sessionId:guid}/finish")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Finish(Guid sessionId)
    {
        if (!await _quizSessionService.IsGuestSessionAsync(sessionId)) return NotFound();

        var result = await _quizSessionService.DiscardGuestSessionAsync(sessionId);
        if (!result.IsSuccess) return HandleResult(result);

        SetGuestPlayedCookie(SpentValue);

        return NoContent();
    }

    private void SetGuestPlayedCookie(string value) =>
        Response.Cookies.Append(GuestPlayedCookieName, value, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = DateTime.UtcNow.AddYears(1),
        });
}
