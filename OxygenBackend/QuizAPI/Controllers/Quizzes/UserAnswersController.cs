using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.DTOs.Quiz;

namespace QuizAPI.Controllers;

public class UserAnswersController : BaseApiController
{
    private readonly IUserAnswerService _userAnswerService;

    public UserAnswersController(IUserAnswerService userAnswerService)
    {
        _userAnswerService = userAnswerService;
    }

    /// <summary>
    /// Submits a new answer for a question within a session.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(UserAnswerDto), StatusCodes.Status200OK)] // Using 200 OK as we don't have a GetAnswerById endpoint
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> SubmitAnswer([FromBody] UserAnswerCM model)
    {
        var result = await _userAnswerService.SubmitAnswerAsync(model);
        // Ideally, this would be a CreatedAtAction, but we don't have a GET endpoint
        // for a single answer. So, returning 200 OK with the created object is a
        // perfectly acceptable alternative.
        return HandleResult(result);
    }

    /// <summary>
    /// Gets all answers submitted for a specific quiz session.
    /// </summary>
    [HttpGet("session/{sessionId:guid}")]
    [ProducesResponseType(typeof(List<UserAnswerDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetSessionAnswers(Guid sessionId)
    {
        var result = await _userAnswerService.GetSessionAnswersAsync(sessionId);
        return HandleResult(result);
    }

    /// <summary>
    /// Updates an existing answer.
    /// </summary>
    [HttpPut("{answerId:int}")]
    [ProducesResponseType(typeof(UserAnswerDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UpdateAnswer(int answerId, [FromBody] UserAnswerCM model)
    {
        var result = await _userAnswerService.UpdateAnswerAsync(answerId, model);
        return HandleResult(result);
    }

    /// <summary>
    /// Deletes a specific answer.
    /// </summary>
    [HttpDelete("{answerId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteAnswer(int answerId)
    {
        var result = await _userAnswerService.DeleteAnswerAsync(answerId);
        return HandleResult(result);
    }
}