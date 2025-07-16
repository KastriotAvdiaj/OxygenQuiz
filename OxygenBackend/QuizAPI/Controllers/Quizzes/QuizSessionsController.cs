using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.DTOs.Quiz;

namespace QuizAPI.Controllers;

// Inherits from our BaseApiController to get the HandleResult helper method.
[ApiController] // Recommended to add this attribute
[Route("api/[controller]")] // Recommended to add a route prefix
public class QuizSessionsController : BaseApiController
{
    private readonly IQuizSessionService _quizSessionService;

    public QuizSessionsController(IQuizSessionService quizSessionService)
    {
        _quizSessionService = quizSessionService;
    }

    #region --- Live Quiz Flow ---

    [HttpGet("{sessionId:guid}/current-state")]
    [ProducesResponseType(typeof(QuizStateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentState(Guid sessionId)
    {
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
        var result = await _quizSessionService.GetNextQuestionAsync(sessionId);
        return HandleResult(result);
    }

    /// <summary>
    /// Submits an answer for the current question in a session. This is the primary endpoint for answering questions.
    /// </summary>
    [HttpPost("answer")] // Route doesn't need sessionId as it's in the body.
    [ProducesResponseType(typeof(AnswerResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SubmitAnswer([FromBody] UserAnswerCM model)
    {
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
        var result = await _quizSessionService.CompleteSessionAsync(sessionId);
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
        var result = await _quizSessionService.DeleteSessionAsync(sessionId);
        return HandleResult(result);
    }

    #endregion
}