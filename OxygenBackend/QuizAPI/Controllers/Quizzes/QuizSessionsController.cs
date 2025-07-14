using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.DTOs.Quiz;

namespace QuizAPI.Controllers;

// Inherits from our BaseApiController to get the HandleResult helper method.
public class QuizSessionsController : BaseApiController
{
    private readonly IQuizSessionService _quizSessionService;

    public QuizSessionsController(IQuizSessionService quizSessionService)
    {
        _quizSessionService = quizSessionService;
    }

    /// <summary>
    /// Creates a new quiz session for a user.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(QuizSessionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> CreateSession([FromBody] QuizSessionCM model)
    {
        var result = await _quizSessionService.CreateSessionAsync(model);

        // For a successful creation (POST), the REST standard is to return a 201 Created
        // response with a 'Location' header pointing to the new resource.
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
    /// Gets a specific quiz session by its ID.
    /// </summary>
    [HttpGet("{sessionId:guid}")]
    [ProducesResponseType(typeof(QuizSessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
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
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetUserSessions(Guid userId)
    {
        var result = await _quizSessionService.GetUserSessionsAsync(userId);
        return HandleResult(result);
    }

    /// <summary>
    /// Marks a quiz session as complete and calculates the final score.
    /// </summary>
    // Using HttpPost for this action is appropriate because it changes the state
    // of the resource in a non-idempotent way.
    [HttpPost("{sessionId:guid}/complete")]
    [ProducesResponseType(typeof(QuizSessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
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
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteSession(Guid sessionId)
    {
        var result = await _quizSessionService.DeleteSessionAsync(sessionId);
        return HandleResult(result);
    }
}