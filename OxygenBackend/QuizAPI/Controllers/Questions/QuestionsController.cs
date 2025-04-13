using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Shared;
using QuizAPI.DTOs.User;
using QuizAPI.Helpers;
using QuizAPI.Models;
using QuizAPI.Services;
using System.Security.Claims;
using QuizAPI.Controllers.Questions.Services;
using QuizAPI.Controllers.Questions.Services.AnswerOptions;

namespace QuizAPI.Controllers.Questions
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuestionsController : ControllerBase
    {
        private readonly IQuestionService _questionService;

        public QuestionsController(IQuestionService questionService)
        {
            _questionService = questionService;
        }

        // GET: api/questions
        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuestionBaseDTO>>> GetQuestions([FromQuery] string visibility = null)
        {
            var questions = await _questionService.GetAllQuestionsAsync(visibility);
            return Ok(questions);
        }

        // GET: api/questions/5
        [HttpGet("{id}")]
        public async Task<ActionResult<QuestionBaseDTO>> GetQuestion(int id)
        {
            var question = await _questionService.GetQuestionByIdAsync(id);

            if (question == null)
            {
                return NotFound();
            }

            return Ok(question);
        }

        // GET: api/questions/multiplechoice
        [HttpGet("multiplechoice")]
        public async Task<ActionResult<IEnumerable<MultipleChoiceQuestionDTO>>> GetMultipleChoiceQuestions()
        {
            var questions = await _questionService.GetMultipleChoiceQuestionsAsync();
            return Ok(questions);
        }

        // GET: api/questions/truefalse
        [HttpGet("truefalse")]
        public async Task<ActionResult<IEnumerable<TrueFalseQuestionDTO>>> GetTrueFalseQuestions()
        {
            var questions = await _questionService.GetTrueFalseQuestionsAsync();
            return Ok(questions);
        }

        // GET: api/questions/typeanswer
        [HttpGet("typeanswer")]
        public async Task<ActionResult<IEnumerable<TypeAnswerQuestionDTO>>> GetTypeAnswerQuestions()
        {
            var questions = await _questionService.GetTypeAnswerQuestionsAsync();
            return Ok(questions);
        }

        // POST: api/questions/multiplechoice
        [HttpPost("multiplechoice")]
      /*  [Authorize]*/
        public async Task<ActionResult<MultipleChoiceQuestionDTO>> CreateMultipleChoiceQuestion(MultipleChoiceQuestionCM questionCM)
        {
            // Get the user ID from the authenticated user
            /*var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));*/

            var userId = Guid.Parse("F746E3AC-8425-446F-986E-2E0CD93F9259");

            var createdQuestion = await _questionService.CreateMultipleChoiceQuestionAsync(questionCM, userId);

            return CreatedAtAction(
                nameof(GetQuestion),
                new { id = createdQuestion.Id },
                createdQuestion
            );
        }

        // POST: api/questions/truefalse
        [HttpPost("truefalse")]
        [Authorize]
        public async Task<ActionResult<TrueFalseQuestionDTO>> CreateTrueFalseQuestion(TrueFalseQuestionCM questionCM)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var createdQuestion = await _questionService.CreateTrueFalseQuestionAsync(questionCM, userId);

            return CreatedAtAction(
                nameof(GetQuestion),
                new { id = createdQuestion.Id },
                createdQuestion
            );
        }

        // POST: api/questions/typeanswer
        [HttpPost("typeanswer")]
        [Authorize]
        public async Task<ActionResult<TypeAnswerQuestionDTO>> CreateTypeAnswerQuestion(TypeAnswerQuestionCM questionCM)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var createdQuestion = await _questionService.CreateTypeAnswerQuestionAsync(questionCM, userId);

            return CreatedAtAction(
                nameof(GetQuestion),
                new { id = createdQuestion.Id },
                createdQuestion
            );
        }

        // PUT: api/questions/multiplechoice
        [HttpPut("multiplechoice")]
        [Authorize]
        public async Task<IActionResult> UpdateMultipleChoiceQuestion(MultipleChoiceQuestionUM questionUM)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var updatedQuestion = await _questionService.UpdateMultipleChoiceQuestionAsync(questionUM, userId);

            if (updatedQuestion == null)
            {
                return NotFound();
            }

            return NoContent();
        }

        // PUT: api/questions/truefalse
        [HttpPut("truefalse")]
        [Authorize]
        public async Task<IActionResult> UpdateTrueFalseQuestion(TrueFalseQuestionUM questionUM)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var updatedQuestion = await _questionService.UpdateTrueFalseQuestionAsync(questionUM, userId);

            if (updatedQuestion == null)
            {
                return NotFound();
            }

            return NoContent();
        }

        // PUT: api/questions/typeanswer
        [HttpPut("typeanswer")]
        [Authorize]
        public async Task<IActionResult> UpdateTypeAnswerQuestion(TypeAnswerQuestionUM questionUM)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var updatedQuestion = await _questionService.UpdateTypeAnswerQuestionAsync(questionUM, userId);

            if (updatedQuestion == null)
            {
                return NotFound();
            }

            return NoContent();
        }

        // DELETE: api/questions/5
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteQuestion(int id)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var result = await _questionService.DeleteQuestionAsync(id, userId);

            if (!result)
            {
                return NotFound();
            }

            return NoContent();
        }

        // GET: api/questions/category/5
        [HttpGet("category/{categoryId}")]
        public async Task<ActionResult<IEnumerable<QuestionBaseDTO>>> GetQuestionsByCategory(int categoryId)
        {
            var questions = await _questionService.GetQuestionsByCategoryAsync(categoryId);
            return Ok(questions);
        }

        // GET: api/questions/difficulty/5
        [HttpGet("difficulty/{difficultyId}")]
        public async Task<ActionResult<IEnumerable<QuestionBaseDTO>>> GetQuestionsByDifficulty(int difficultyId)
        {
            var questions = await _questionService.GetQuestionsByDifficultyAsync(difficultyId);
            return Ok(questions);
        }

        // GET: api/questions/user
        [HttpGet("user")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<QuestionBaseDTO>>> GetMyQuestions()
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var questions = await _questionService.GetQuestionsByUserAsync(userId);
            return Ok(questions);
        }
    }
}