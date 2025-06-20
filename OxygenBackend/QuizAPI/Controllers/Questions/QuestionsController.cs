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
using System.Text.Json;

namespace QuizAPI.Controllers.Questions
{

    public static class HttpExtensions
    {
        public static void AddPaginationHeader(this HttpResponse response, int currentPage,
            int itemsPerPage, int totalItems, int totalPages, bool hasNextPage, bool hasPreviousPage)
        {
            var paginationHeader = new
            {
                currentPage,
                itemsPerPage,
                totalItems,
                totalPages,
                hasNextPage,
                hasPreviousPage
            };

            var options = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            response.Headers.Append("Pagination", JsonSerializer.Serialize(paginationHeader, options));
            // To allow the client to access the header
            /*response.Headers.Add("Access-Control-Expose-Headers", "Pagination");*/ // REMOVED THIS BECAUSE IT IS REDUNDANT AND WE'RE ALREADY USING CORS
        }
    }

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
        public async Task<ActionResult<List<QuestionBaseDTO>>> GetQuestions([FromQuery] QuestionFilterParams filterParams)
        {
            var pagedQuestions = await _questionService.GetPaginatedQuestionsAsync(filterParams);

            Response.AddPaginationHeader(
                 pagedQuestions.PageNumber,
                 pagedQuestions.PageSize,
                 pagedQuestions.TotalCount,
                 pagedQuestions.TotalPages,
                 pagedQuestions.HasNextPage,
                 pagedQuestions.HasPreviousPage
                 );

            return Ok(pagedQuestions.Items);
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
        public async Task<ActionResult<List<MultipleChoiceQuestionDTO>>> GetMultipleChoiceQuestions([FromQuery] QuestionFilterParams filterParams)
        {
            var pagedQuestions = await _questionService.GetPaginatedMultipleChoiceQuestionsAsync(filterParams);

            Response.AddPaginationHeader(
                 pagedQuestions.PageNumber,
                 pagedQuestions.PageSize,
                 pagedQuestions.TotalCount,
                 pagedQuestions.TotalPages,
                 pagedQuestions.HasNextPage,
                 pagedQuestions.HasPreviousPage
                 );

            return Ok(pagedQuestions.Items);
        }

        // GET: api/questions/truefalse
        [HttpGet("trueFalse")]
        public async Task<ActionResult<List<TrueFalseQuestionDTO>>> GetTrueFalseQuestions([FromQuery] QuestionFilterParams filterParams)
        {
            var pagedQuestions = await _questionService.GetPaginatedTrueFalseQuestionsAsync(filterParams);

            Response.AddPaginationHeader(
                            pagedQuestions.PageNumber,
                            pagedQuestions.PageSize,
                            pagedQuestions.TotalCount,
                            pagedQuestions.TotalPages,
                            pagedQuestions.HasNextPage,
                            pagedQuestions.HasPreviousPage
                            );

            return Ok(pagedQuestions.Items);
        }

        // GET: api/questions/typeanswer
        [HttpGet("typeTheAnswer")]
        public async Task<ActionResult<List<TypeTheAnswerQuestionDTO>>> GetTypeTheAnswerQuestions([FromQuery] QuestionFilterParams filterParams)
        {
            var pagedQuestions = await _questionService.GetPaginatedTypeTheAnswerQuestionsAsync(filterParams);

            Response.AddPaginationHeader(
                pagedQuestions.PageNumber,
                pagedQuestions.PageSize,
                pagedQuestions.TotalCount,
                pagedQuestions.TotalPages,
                pagedQuestions.HasNextPage,
                pagedQuestions.HasPreviousPage
                );

            return Ok(pagedQuestions.Items);
        }

        // POST: api/questions/multiplechoice
        [HttpPost("multiplechoice")]
      /*  [Authorize]*/
        public async Task<ActionResult<MultipleChoiceQuestionDTO>> CreateMultipleChoiceQuestion(MultipleChoiceQuestionCM questionCM)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

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
        [HttpPost("typetheanswer")]
        [Authorize]
        public async Task<ActionResult<TypeTheAnswerQuestionDTO>> CreateTypeTheAnswerQuestion(TypeTheAnswerQuestionCM questionCM)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var createdQuestion = await _questionService.CreateTypeTheAnswerQuestionAsync(questionCM, userId);

            return CreatedAtAction(
                nameof(GetQuestion),
                new { id = createdQuestion.Id },
                createdQuestion
            );
        }

        // PUT: api/questions/multiplechoice
        [HttpPut("multiplechoice/{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateMultipleChoiceQuestion(int id, [FromBody] MultipleChoiceQuestionUM questionUM)
        {
            if (id != questionUM.Id)
                return BadRequest("ID mismatch between URL and request body.");

            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var updatedQuestion = await _questionService.UpdateMultipleChoiceQuestionAsync(questionUM, userId);

            if (updatedQuestion == null)
                return NotFound();

            return NoContent();
        }

        // PUT: api/questions/truefalse
        [HttpPut("truefalse/{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateTrueFalseQuestion(int id, [FromBody] TrueFalseQuestionUM questionUM)
        {
            if (id != questionUM.Id)
                return BadRequest("ID mismatch between URL and request body.");

            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var updatedQuestion = await _questionService.UpdateTrueFalseQuestionAsync(questionUM, userId);

            if (updatedQuestion == null)
            {
                return NotFound();
            }

            return NoContent();
        }

        // PUT: api/questions/typeanswer
        [HttpPut("typetheanswer/{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateTypeTheAnswerQuestion(int id, [FromBody] TypeTheAnswerQuestionUM questionUM)
        {
            if (id != questionUM.Id)
                return BadRequest("ID mismatch between URL and request body.");


            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var updatedQuestion = await _questionService.UpdateTypeTheAnswerQuestionAsync(questionUM, userId);

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
            var (success, errorMessage, isCustomMessage) = await _questionService.DeleteQuestionAsync(id, userId);

            if (!success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = errorMessage,
                    isCustomMessage = isCustomMessage // Flag to indicate user-friendly message
                });
            }

            return Ok(new
            {
                success = true,
                message = "Question deleted successfully."
            });
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

        [Authorize]
        [HttpGet("myQuestions")]
        public async Task<ActionResult<List<QuestionBaseDTO>>> GetMyQuestions([FromQuery] QuestionFilterParams filterParams)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            filterParams.UserId = Guid.Parse(userId);

            var pagedQuestions = await _questionService.GetPaginatedQuestionsAsync(filterParams);

            Response.AddPaginationHeader(
                 pagedQuestions.PageNumber,
                 pagedQuestions.PageSize,
                 pagedQuestions.TotalCount,
                 pagedQuestions.TotalPages,
                 pagedQuestions.HasNextPage,
                 pagedQuestions.HasPreviousPage
                 );

            return Ok(pagedQuestions.Items);
        }
    }
}