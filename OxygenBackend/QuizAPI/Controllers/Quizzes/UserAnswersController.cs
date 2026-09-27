using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.UserAnswerService;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Services.CurrentUserService;

namespace QuizAPI.Controllers;

/// <summary>
/// Answers submitted in a session.
///
/// <para>Until 2026-09-26 this controller had no <c>[Authorize]</c> at all — no global fallback
/// policy exists, so both actions were anonymous: anyone holding a session id could read its
/// answer key, and anyone could delete any answer by walking integer ids. Nothing in the frontend
/// calls it; it stays because docs/quiz/user-stats-history.md lists the read as the per-question
/// review endpoint.</para>
/// </summary>
[ApiController]
[Authorize]
[Route("api/[controller]")]
public class UserAnswersController : BaseApiController
{
    private readonly IUserAnswerService _userAnswerService;
    private readonly IQuizSessionService _quizSessionService;
    private readonly ICurrentUserService _currentUser;

    public UserAnswersController(
        IUserAnswerService userAnswerService,
        IQuizSessionService quizSessionService,
        ICurrentUserService currentUser)
    {
        _userAnswerService = userAnswerService;
        _quizSessionService = quizSessionService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// All answers submitted in a session, in quiz order. Owner or admin only; anyone else gets the
    /// same 404 as a session that doesn't exist, so ids can't be probed. Answer keys are withheld
    /// while the session is unfinished and its quiz has no instant feedback — the same rule as
    /// <c>GET /quizsessions/{id}</c> (see <c>QuizSessionMappers.ProjectUserAnswer</c>).
    /// </summary>
    [HttpGet("session/{sessionId:guid}")]
    [ProducesResponseType(typeof(List<UserAnswerDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSessionAnswers(Guid sessionId)
    {
        var currentUserId = _currentUser.UserId;
        if (currentUserId is null) return Unauthorized();

        var ownerId = await _quizSessionService.GetSessionOwnerAsync(sessionId);
        if (ownerId is null || (ownerId != currentUserId && !_currentUser.IsAdmin))
            return NotFound();

        var result = await _userAnswerService.GetSessionAnswersAsync(sessionId);
        return HandleResult(result);
    }

    /// <summary>
    /// Deletes one answer from a completed session. Administrative clean-up only.
    /// </summary>
    [HttpDelete("{answerId:int}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAnswer(int answerId)
    {
        var result = await _userAnswerService.DeleteAnswerAsync(answerId);
        return HandleResult(result);
    }
}
