using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Questions.Services;
using QuizAPI.DTOs.Question;
using QuizAPI.Extensions;
using QuizAPI.Models;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Services.Permissions;

namespace QuizAPI.Controllers.Questions
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuestionsController : BaseApiController
    {
        private readonly IQuestionService _questionService;
        private readonly ICurrentUserService _currentUserService;
        private readonly IPermissionService _permissionService;

        public QuestionsController(
            IQuestionService questionService,
            ICurrentUserService currentUserService,
            IPermissionService permissionService)
        {
            _questionService = questionService;
            _currentUserService = currentUserService;
            _permissionService = permissionService;
        }

        // ── GET ───────────────────────────────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetQuestions([FromQuery] QuestionFilterParams filterParams)
        {
            var pagedQuestions = await _questionService.GetPaginatedQuestionsAsync(filterParams);
            Response.AddPaginationHeader(pagedQuestions);
            return Ok(pagedQuestions.Items);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetQuestion(int id)
        {
            var question = await _questionService.GetQuestionByIdAsync(id);
            return question == null ? NotFound() : Ok(question);
        }

        [HttpGet("multiplechoice")]
        public async Task<IActionResult> GetMultipleChoiceQuestions([FromQuery] QuestionFilterParams filterParams)
        {
            var pagedQuestions = await _questionService.GetPaginatedMultipleChoiceQuestionsAsync(filterParams);
            Response.AddPaginationHeader(pagedQuestions);
            return Ok(pagedQuestions.Items);
        }

        [HttpGet("truefalse")]
        public async Task<IActionResult> GetTrueFalseQuestions([FromQuery] QuestionFilterParams filterParams)
        {
            var pagedQuestions = await _questionService.GetPaginatedTrueFalseQuestionsAsync(filterParams);
            Response.AddPaginationHeader(pagedQuestions);
            return Ok(pagedQuestions.Items);
        }

        [HttpGet("typetheanswer")]
        public async Task<IActionResult> GetTypeTheAnswerQuestions([FromQuery] QuestionFilterParams filterParams)
        {
            var pagedQuestions = await _questionService.GetPaginatedTypeTheAnswerQuestionsAsync(filterParams);
            Response.AddPaginationHeader(pagedQuestions);
            return Ok(pagedQuestions.Items);
        }

        [HttpGet("category/{categoryId}")]
        public async Task<IActionResult> GetQuestionsByCategory(int categoryId)
            => Ok(await _questionService.GetQuestionsByCategoryAsync(categoryId));

        [HttpGet("difficulty/{difficultyId}")]
        public async Task<IActionResult> GetQuestionsByDifficulty(int difficultyId)
            => Ok(await _questionService.GetQuestionsByDifficultyAsync(difficultyId));

        [HttpGet("myQuestions")]
        [Authorize]
        public async Task<IActionResult> GetMyQuestions([FromQuery] QuestionFilterParams filterParams)
        {
            var userId = _currentUserService.UserId;
            if (userId == null) return Unauthorized();

            filterParams.UserId = userId.Value;

            var pagedQuestions = await _questionService.GetPaginatedQuestionsAsync(filterParams);
            Response.AddPaginationHeader(pagedQuestions);
            return Ok(pagedQuestions.Items);
        }

        // ── CREATE ────────────────────────────────────────────────────────────

        [HttpPost("multiplechoice")]
        [Authorize]
        public async Task<IActionResult> CreateMultipleChoiceQuestion(MultipleChoiceQuestionCM questionCM)
        {
            var userId = _currentUserService.UserId;
            if (userId == null) return Unauthorized();

            if (!await _permissionService.HasPermissionAsync(userId.Value, "question:create"))
                return Forbid();

            var createdQuestion = await _questionService.CreateMultipleChoiceQuestionAsync(questionCM, userId.Value);
            return CreatedAtAction(nameof(GetQuestion), new { id = createdQuestion.Id }, createdQuestion);
        }

        [HttpPost("truefalse")]
        [Authorize]
        public async Task<IActionResult> CreateTrueFalseQuestion(TrueFalseQuestionCM questionCM)
        {
            var userId = _currentUserService.UserId;
            if (userId == null) return Unauthorized();

            if (!await _permissionService.HasPermissionAsync(userId.Value, "question:create"))
                return Forbid();

            var createdQuestion = await _questionService.CreateTrueFalseQuestionAsync(questionCM, userId.Value);
            return CreatedAtAction(nameof(GetQuestion), new { id = createdQuestion.Id }, createdQuestion);
        }

        [HttpPost("typetheanswer")]
        [Authorize]
        public async Task<IActionResult> CreateTypeTheAnswerQuestion(TypeTheAnswerQuestionCM questionCM)
        {
            var userId = _currentUserService.UserId;
            if (userId == null) return Unauthorized();

            if (!await _permissionService.HasPermissionAsync(userId.Value, "question:create"))
                return Forbid();

            var createdQuestion = await _questionService.CreateTypeTheAnswerQuestionAsync(questionCM, userId.Value);
            return CreatedAtAction(nameof(GetQuestion), new { id = createdQuestion.Id }, createdQuestion);
        }

        // ── UPDATE ────────────────────────────────────────────────────────────

        [HttpPut("multiplechoice/{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateMultipleChoiceQuestion(int id, [FromBody] MultipleChoiceQuestionUM questionUM)
        {
            if (id != questionUM.Id)
                return BadRequest("ID mismatch between URL and request body.");

            var userId = _currentUserService.UserId;
            if (userId == null) return Unauthorized();

            var ownerId = await _questionService.GetQuestionOwnerAsync(id);
            if (ownerId == null) return NotFound();

            if (!await _permissionService.CanActOnResourceAsync(userId.Value, ownerId.Value, "question", "update"))
                return Forbid();

            var canUpdateAny = await _permissionService.HasPermissionAsync(userId.Value, "question:update:any");
            var result = await _questionService.UpdateMultipleChoiceQuestionAsync(questionUM, userId.Value, canUpdateAny);

            return result == null ? NotFound() : NoContent();
        }

        [HttpPut("truefalse/{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateTrueFalseQuestion(int id, [FromBody] TrueFalseQuestionUM questionUM)
        {
            if (id != questionUM.Id)
                return BadRequest("ID mismatch between URL and request body.");

            var userId = _currentUserService.UserId;
            if (userId == null) return Unauthorized();

            var ownerId = await _questionService.GetQuestionOwnerAsync(id);
            if (ownerId == null) return NotFound();

            if (!await _permissionService.CanActOnResourceAsync(userId.Value, ownerId.Value, "question", "update"))
                return Forbid();

            var canUpdateAny = await _permissionService.HasPermissionAsync(userId.Value, "question:update:any");
            var result = await _questionService.UpdateTrueFalseQuestionAsync(questionUM, userId.Value, canUpdateAny);

            return result == null ? NotFound() : NoContent();
        }

        [HttpPut("typetheanswer/{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateTypeTheAnswerQuestion(int id, [FromBody] TypeTheAnswerQuestionUM questionUM)
        {
            if (id != questionUM.Id)
                return BadRequest("ID mismatch between URL and request body.");

            var userId = _currentUserService.UserId;
            if (userId == null) return Unauthorized();

            var ownerId = await _questionService.GetQuestionOwnerAsync(id);
            if (ownerId == null) return NotFound();

            if (!await _permissionService.CanActOnResourceAsync(userId.Value, ownerId.Value, "question", "update"))
                return Forbid();

            var canUpdateAny = await _permissionService.HasPermissionAsync(userId.Value, "question:update:any");
            var result = await _questionService.UpdateTypeTheAnswerQuestionAsync(questionUM, userId.Value, canUpdateAny);

            return result == null ? NotFound() : NoContent();
        }

        // ── DELETE ────────────────────────────────────────────────────────────

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteQuestion(int id)
        {
            var userId = _currentUserService.UserId;
            if (userId == null) return Unauthorized();

            var ownerId = await _questionService.GetQuestionOwnerAsync(id);
            if (ownerId == null) return NotFound();

            if (!await _permissionService.CanActOnResourceAsync(userId.Value, ownerId.Value, "question", "delete"))
                return Forbid();

            var canDeleteAny = await _permissionService.HasPermissionAsync(userId.Value, "question:delete:any");
            var (success, errorMessage, isCustomMessage) = await _questionService.DeleteQuestionAsync(id, userId.Value, canDeleteAny);

            return success
                ? Ok(new { success = true, message = "Question deleted successfully." })
                : HandleCustomError(errorMessage, isCustomMessage);
        }
    }
}