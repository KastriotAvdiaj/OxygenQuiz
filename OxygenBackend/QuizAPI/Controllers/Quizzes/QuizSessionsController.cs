using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Services.CurrentUserService;

namespace QuizAPI.Controllers;

// Inherits from our BaseApiController to get the HandleResult helper method.
//
// Every route here operates on a quiz session that belongs to exactly one real account, so the
// whole controller requires authentication and each session-scoped action verifies the caller owns
// the session before doing anything (IDOR protection — see docs/deployment/known-issues.md P1). The user id is
// always taken from the JWT, never from the request body/query, so a client can't act as someone
// else by supplying a different UserId. Anonymous guest play lives in GuestQuizSessionsController.
[ApiController] // Recommended to add this attribute
[Authorize]
[Route("api/[controller]")] // Recommended to add a route prefix
public class QuizSessionsController : BaseApiController
{
    private readonly IQuizSessionService _quizSessionService;
    private readonly ICurrentUserService _currentUser;

    public QuizSessionsController(
        IQuizSessionService quizSessionService,
        ICurrentUserService currentUser)
    {
        _quizSessionService = quizSessionService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Confirms the authenticated caller owns <paramref name="sessionId"/> (or is an admin).
    /// Returns <c>null</c> when access is allowed; otherwise the IActionResult to return.
    /// A session that doesn't exist and one owned by someone else both yield 404, so session ids
    /// can't be probed for existence.
    /// </summary>
    private async Task<IActionResult?> EnsureSessionAccessAsync(Guid sessionId)
    {
        var currentUserId = _currentUser.UserId;
        if (currentUserId is null)
            return Unauthorized();

        var ownerId = await _quizSessionService.GetSessionOwnerAsync(sessionId);
        if (ownerId is null)
            return NotFound();

        if (ownerId != currentUserId && !_currentUser.IsAdmin)
            return NotFound();

        return null;
    }

    #region --- Live Quiz Flow ---

    [HttpGet("{sessionId:guid}/current-state")]
    [ProducesResponseType(typeof(QuizStateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentState(Guid sessionId)
    {
        var denied = await EnsureSessionAccessAsync(sessionId);
        if (denied != null) return denied;

        var result = await _quizSessionService.GetCurrentStateAsync(sessionId);
        return HandleResult(result);
    }

    /// <summary>
    /// Gets the next available question for an active quiz session and starts its timer.
    /// </summary>
    [HttpGet("{sessionId:guid}/next-question")]
    [ProducesResponseType(typeof(CurrentQuestionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetNextQuestion(Guid sessionId)
    {
        var denied = await EnsureSessionAccessAsync(sessionId);
        if (denied != null) return denied;

        var result = await _quizSessionService.GetNextQuestionAsync(sessionId);
        return HandleResult(result);
    }

    /// <summary>
    /// Submits an answer for the current question in a session. This is the primary endpoint for answering questions.
    /// </summary>
    [HttpPost("answer")]
    [ProducesResponseType(typeof(InstantFeedbackAnswerResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SubmitAnswer([FromBody] UserAnswerCM model)
    {
        var denied = await EnsureSessionAccessAsync(model.SessionId);
        if (denied != null) return denied;

        var result = await _quizSessionService.SubmitAnswerAsync(model);
        return HandleResult(result);
    }

    #endregion

    #region --- Session Management ---

    /// <summary>
    /// Creates a new quiz session for a user.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(QuizSessionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateSession([FromBody] QuizSessionCM model)
   {
        var currentUserId = _currentUser.UserId;
        if (currentUserId is null) return Unauthorized();

        // Never trust a client-supplied UserId — pin the session to the authenticated caller.
        model.UserId = currentUserId.Value;

        var result = await _quizSessionService.CreateSessionAsync(model);

        if (result.IsSuccess)
        {
            return CreatedAtAction(
                nameof(GetSession),
                new { sessionId = result.Data!.Id },
                result.Data);
        }

        return HandleResult(result);
    }

    /// <summary>
    /// Gets a specific quiz session by its ID, including all answers submitted so far.
    /// </summary>
    [HttpGet("{sessionId:guid}")]
    [ProducesResponseType(typeof(QuizSessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSession(Guid sessionId)
    {
        var denied = await EnsureSessionAccessAsync(sessionId);
        if (denied != null) return denied;

        var result = await _quizSessionService.GetSessionAsync(sessionId);
        return HandleResult(result);
    }

    /// <summary>
    /// Gets a summary of all quiz sessions for a specific user.
    /// </summary>
    [HttpGet("user/{userId:guid}")]
    [ProducesResponseType(typeof(List<QuizSessionSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUserSessions(Guid userId)
    {
        var currentUserId = _currentUser.UserId;
        if (currentUserId is null) return Unauthorized();

        // Only your own history is visible (admins may view anyone's).
        if (userId != currentUserId && !_currentUser.IsAdmin)
            return Forbid();

        var result = await _quizSessionService.GetUserSessionsAsync(userId);
        return HandleResult(result);
    }

    /// <summary>
    /// Manually marks a quiz session as complete. Use this for a "Quit Quiz" button.
    /// </summary>
    [HttpPost("{sessionId:guid}/complete")]
    [ProducesResponseType(typeof(QuizSessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CompleteSession(Guid sessionId)
    {
        var denied = await EnsureSessionAccessAsync(sessionId);
        if (denied != null) return denied;

        var result = await _quizSessionService.CompleteSessionAsync(sessionId);
        return HandleResult(result);
    }

    /// <summary>
    /// Manually triggers cleanup of abandoned quiz sessions. Useful for testing and immediate cleanup.
    /// This is a global maintenance operation (it touches every user's abandoned sessions), so it is
    /// restricted to admins.
    /// </summary>
    [HttpPost("cleanup")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
    public async Task<IActionResult> CleanupAbandonedSessions()
    {
        var result = await _quizSessionService.CleanupAbandonedSessionsAsync();
        return HandleResult(result);
    }

    /// <summary>
    /// Deletes a quiz session and all its associated answers.
    /// </summary>
    [HttpDelete("{sessionId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteSession(Guid sessionId)
    {
        var denied = await EnsureSessionAccessAsync(sessionId);
        if (denied != null) return denied;

        var result = await _quizSessionService.DeleteSessionAsync(sessionId);
        return HandleResult(result);
    }

    #endregion

    /// <summary>
    /// Resolves and resumes a quiz session. Auto-times-out any expired questions
    /// using mathematical catch-up, then returns the correct question to resume on.
    /// </summary>
    [HttpPost("{sessionId:guid}/resolve-and-resume")]
    [ProducesResponseType(typeof(ResumeResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResolveAndResume(Guid sessionId, [FromBody] ResumeRequestDto request)
    {
        var currentUserId = _currentUser.UserId;
        if (currentUserId is null) return Unauthorized();

        // Resolve against the authenticated user — the service filters by UserId, so a session
        // belonging to anyone else simply isn't found. The body's UserId is ignored.
        var result = await _quizSessionService.ResolveAndResumeAsync(sessionId, currentUserId.Value);
        return HandleResult(result);
    }

    #region --- Grading Status Endpoints ---

    /// <summary>
    /// Gets the grading status for a quiz session (useful for non-instant feedback quizzes).
    /// Returns how many answers have been graded vs total answers.
    /// </summary>
    [HttpGet("{sessionId:guid}/grading-status")]
    [ProducesResponseType(typeof(SessionGradingStatus), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetGradingStatus(Guid sessionId)
    {
        var denied = await EnsureSessionAccessAsync(sessionId);
        if (denied != null) return denied;

        var result = await _quizSessionService.GetGradingStatusAsync(sessionId);
        return HandleResult(result);
    }

    /// <summary>
    /// Gets the session results, waiting up to 30 seconds for all answers to be graded.
    /// Use this on the results page for non-instant feedback quizzes.
    /// </summary>
    [HttpGet("{sessionId:guid}/results")]
    [ProducesResponseType(typeof(QuizSessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSessionResults(Guid sessionId, [FromQuery] int maxWaitSeconds = 30)
    {
        var denied = await EnsureSessionAccessAsync(sessionId);
        if (denied != null) return denied;

        var result = await _quizSessionService.GetSessionWithGradedAnswersAsync(sessionId, maxWaitSeconds);
        return HandleResult(result);
    }

    /// <summary>
    /// Abandons an existing session and creates a new one for the same quiz.
    /// Useful when user wants to restart a quiz they already have in progress.
    /// </summary>
    [HttpPost("{sessionId:guid}/abandon-and-restart")]
    [ProducesResponseType(typeof(QuizSessionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AbandonAndCreateNewSession(Guid sessionId, [FromBody] QuizSessionCM model)
    {
        var currentUserId = _currentUser.UserId;
        if (currentUserId is null) return Unauthorized();

        // Pin to the caller: the service requires the existing session to belong to model.UserId,
        // so this both enforces ownership of the abandoned session and stamps the new one correctly.
        model.UserId = currentUserId.Value;

        var result = await _quizSessionService.AbandonAndCreateNewSessionAsync(sessionId, model);

        if (result.IsSuccess)
        {
            return CreatedAtAction(
                nameof(GetSession),
                new { sessionId = result.Data!.Id },
                result.Data);
        }

        return HandleResult(result);
    }

    /// <summary>
    /// Resumes an existing session that was previously started but not completed.
    /// </summary>
    [HttpPost("{sessionId:guid}/resume")]
    [ProducesResponseType(typeof(QuizSessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResumeSession(Guid sessionId, [FromQuery] Guid userId)
    {
        var currentUserId = _currentUser.UserId;
        if (currentUserId is null) return Unauthorized();

        // Ignore the query-string userId — resume only the caller's own session.
        var result = await _quizSessionService.ResumeSessionAsync(sessionId, currentUserId.Value);
        return HandleResult(result);
    }

    #endregion
}