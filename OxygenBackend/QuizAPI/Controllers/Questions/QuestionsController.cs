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
        private readonly ApplicationDbContext _context;
        private readonly DashboardService _dashboardService;
        private readonly IQuestionService _questionService;


        public QuestionsController(ApplicationDbContext context, DashboardService dashboardService, IQuestionService questionService)
        {
            _context = context;
            _questionService = questionService;
            _dashboardService = dashboardService;
        }


        [HttpGet]
        public async Task<ActionResult<PaginatedResponse<QuestionDTO>>> GetQuestions(
        int page = 1,
        int pageSize = 20,
        string? searchTerm = null,
        string? category = null)
        {
            if (page <= 0 || pageSize <= 0)
                return BadRequest("Page and page size must be positive numbers.");

            var result = await _questionService.GetPaginatedQuestionsAsync(
                page,
                pageSize,
                searchTerm,
                category
            );

            return Ok(result);
        }



        // GET: api/Questions/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<IndividualQuestionDTO>> GetQuestion(int id)
        {

            var questionDto = await _questionService.GetQuestionAsync(id);
            return questionDto != null ? Ok(questionDto) : NotFound();
        }


        // POST: api/Questions
        [Authorize]
        [HttpPost]
        public async Task<ActionResult<Question>> CreateQuestion(QuestionCM newQuestionCM)
        {

            if (!QuestionHelpers.ValidateQuestionDto(newQuestionCM))
                return BadRequest("Invalid question data.");

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID not found in token." });
            }

            var question = await _questionService.CreateQuestionAsync(
                newQuestionCM,
                userId,
                visibility : QuestionVisibility.Global);

            return Ok(question);
        }

        // PUT: api/Questions/{id}
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateQuestion(int id, QuestionUM questionDto)
        {
            var question = await _context.Questions.Include(q => q.AnswerOptions)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (question == null)
                return NotFound();

            if (questionDto.AnswerOptions == null || !QuestionHelpers.ValidateAnswerOptions(questionDto.AnswerOptions))
                return BadRequest("Each question must have at least one correct and one incorrect answer.");

            // Update the question properties
            question.Text = questionDto.Text;
            /* question.DifficultyId = questionDto.DifficultyLevel;*/

            // Clear existing options and add new ones
            _context.AnswerOptions.RemoveRange(question.AnswerOptions);
            question.AnswerOptions = questionDto.AnswerOptions.Select(ao => new AnswerOption
            {
                Text = ao.Text,
                IsCorrect = ao.IsCorrect,
                QuestionId = id
            }).ToList();

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!QuestionExists(id))
                    return NotFound();
                else
                    throw;
            }

            return NoContent();
        }

        [Authorize(Roles = "Admin , SuperAdmin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteQuestion(int id)
        {
            var (success, message) = await _questionService.DeleteQuestionAsync(id);

            if (!success)
            {
                return BadRequest(new { message });
            }

            return NoContent();
        }

        private bool QuestionExists(int id) => _context.Questions.Any(e => e.Id == id);

 
    }
}