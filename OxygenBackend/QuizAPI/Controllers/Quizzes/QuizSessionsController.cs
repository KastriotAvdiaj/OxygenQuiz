using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes
{
    [Route("api/[controller]")]
    [ApiController]
    public class QuizSessionsController : ControllerBase
    {
        private readonly IQuizSessionService _quizSessionService;

        public QuizSessionsController(IQuizSessionService quizSessionService)
        {
            _quizSessionService = quizSessionService;
        }

        // POST: api/QuizSessions/start
        [HttpPost("start")]
        public async Task<ActionResult<QuizSession>> StartQuizSession([FromBody] int quizId)
        {
            try
            {
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (!Guid.TryParse(userIdString, out Guid userId))
                {
                    return Unauthorized(new { message = "Invalid or missing user ID in token." });
                }
                var session = await _quizSessionService.StartQuizSessionAsync(quizId,userId);
                return Ok(session);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // POST: api/QuizSessions/{sessionId}/answers
        [HttpPost("{sessionId}/answers")]
        public async Task<ActionResult<UserAnswer>> SubmitAnswer(Guid sessionId, [FromBody] SubmitAnswerRequest request)
        {
            try
            {
                var answer = await _quizSessionService.SubmitAnswerAsync(sessionId, request.QuestionId, request.SelectedOptionId);
                return Ok(answer);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // POST: api/QuizSessions/{sessionId}/finish
        [HttpPost("{sessionId}/finish")]
        public async Task<ActionResult<int>> FinishQuizSession(Guid sessionId)
        {
            try
            {
                var totalScore = await _quizSessionService.FinishQuizSessionAsync(sessionId);
                return Ok(totalScore);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Optionally, if you need to retrieve session details:
        // GET: api/QuizSessions/{id}
       /* [HttpGet("{id}")]
        public async Task<ActionResult<QuizSession>> GetQuizSession(Guid id)
        {
            // Implementation would likely involve querying the context or extending your service.
            // For now, you could either implement it here or simply return a NotFound if not needed.
            return NotFound("GET session details endpoint is not implemented.");
        }*/
    }


    // DTO for submitting an answer.
    public class SubmitAnswerRequest
    {
        public int QuestionId { get; set; }
        public int SelectedOptionId { get; set; }
    }
}
