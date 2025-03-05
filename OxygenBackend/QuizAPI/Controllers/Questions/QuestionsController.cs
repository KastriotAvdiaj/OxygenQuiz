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
        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateQuestion(int id, QuestionUM questionDto)
        {
            try
            {
                var question = await _questionService.UpdateQuestionAsync(id, questionDto);
                return Ok(question);
            }
            catch (KeyNotFoundException)
            {
                return NotFound("Question not found.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
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