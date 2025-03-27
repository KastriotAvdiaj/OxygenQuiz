using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Quizzes.Services.PrivateQuestionService;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models;
using System.Security.Claims;

namespace QuizAPI.Controllers.Quizzes
{
    [ApiController]
    [Route("api/[controller]")]
    public class PrivateQuestionController : ControllerBase
    {
        private readonly IPrivateQuestionService _questionService;

        public PrivateQuestionController(IPrivateQuestionService questionService)
        {
            _questionService = questionService;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PrivateQuestionCM model)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            var createdQuestion = await _questionService.CreatePrivateQuestionAsync(model, userId);
            return CreatedAtAction(nameof(GetById), new { id = createdQuestion.Id }, createdQuestion);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            var question = await _questionService.GetPrivateQuestionByIdAsync(id, userId);
            if (question == null)
            {
                return NotFound();
            }
            return Ok(question);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            var questions = await _questionService.GetPrivateQuestionsByUserAsync(userId);
            return Ok(questions);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] PrivateQuestionCM model)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            var updated = await _questionService.UpdatePrivateQuestionAsync(id, model, userId);
            if (!updated)
            {
                return NotFound();
            }
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            var deleted = await _questionService.DeletePrivateQuestionAsync(id, userId);
            if (!deleted)
            {
                return NotFound();
            }
            return NoContent();
        }
    }
}
