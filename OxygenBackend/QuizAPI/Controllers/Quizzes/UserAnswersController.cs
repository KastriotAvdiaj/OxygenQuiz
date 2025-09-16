using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.UserAnswerService;
using QuizAPI.DTOs.Quiz;

namespace QuizAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UserAnswersController : BaseApiController
{
    private readonly IUserAnswerService _userAnswerService;

    public UserAnswersController(IUserAnswerService userAnswerService)
    {
        _userAnswerService = userAnswerService;
    }

    /// <summary>
    /// Gets all historical answers submitted for a specific quiz session.
    /// </summary>
    [HttpGet("session/{sessionId:guid}")]
    [ProducesResponseType(typeof(List<UserAnswerDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSessionAnswers(Guid sessionId)
    {
        var result = await _userAnswerService.GetSessionAnswersAsync(sessionId);
        return HandleResult(result);
    }

    /// <summary>
    /// Deletes a specific answer. NOTE: This should be an administrative action
    /// and protected by an appropriate authorization policy.
    /// </summary>
    [HttpDelete("{answerId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAnswer(int answerId)
    {
        var result = await _userAnswerService.DeleteAnswerAsync(answerId);
        return HandleResult(result);
    }
}