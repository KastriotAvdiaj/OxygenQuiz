using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Questions.Services;
using QuizAPI.DTOs.Question;
using QuizAPI.Extensions;
using QuizAPI.Models;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Services.Permissions;
using QuizAPI.Services.Audit;
using QuizAPI.Filtering;

namespace QuizAPI.Controllers.Questions
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuestionsController : BaseApiController
    {
        private readonly IQuestionService _questionService;
        private readonly ICurrentUserService _currentUserService;
        private readonly IPermissionService _permissionService;
        private readonly IAuditService _auditService;

        public QuestionsController(
            IQuestionService questionService,
            ICurrentUserService currentUserService,
            IPermissionService permissionService,
            IAuditService auditService)
        {
            _questionService = questionService;
            _currentUserService = currentUserService;
            _permissionService = permissionService;
            _auditService = auditService;
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

        // ── SEARCH (shared filtering framework) ──────────
        // All endpoints return the standard PagedResponse body envelope and accept the same
        // FilterQuery, e.g.:
        //   ?search=capital
        //   &filter=categoryId:eq:3&filter=createdAt:between:2026-01-01,2026-03-31
        //   &sort=createdAt:desc&page=1&pageSize=20
        //
        // "base" returns lightweight QuestionBase DTOs; the typed routes return rich per-type
        // DTOs. Each has a "mine/…" twin whose ownership is forced server-side, so a caller's
        // filters can only ever narrow within their own questions.

        [HttpGet("search")]
        public async Task<IActionResult> SearchQuestions([FromQuery] FilterQuery query, CancellationToken ct)
            => Ok(await _questionService.SearchQuestionsAsync(query, ct: ct));

        [HttpGet("multiplechoice/search")]
        public async Task<IActionResult> SearchMultipleChoice([FromQuery] FilterQuery query, CancellationToken ct)
            => Ok(await _questionService.SearchMultipleChoiceQuestionsAsync(query, ct: ct));

        [HttpGet("truefalse/search")]
        public async Task<IActionResult> SearchTrueFalse([FromQuery] FilterQuery query, CancellationToken ct)
            => Ok(await _questionService.SearchTrueFalseQuestionsAsync(query, ct: ct));

        [HttpGet("typetheanswer/search")]
        public async Task<IActionResult> SearchTypeTheAnswer([FromQuery] FilterQuery query, CancellationToken ct)
            => Ok(await _questionService.SearchTypeTheAnswerQuestionsAsync(query, ct: ct));

        [HttpGet("mine/multiplechoice/search")]
        [Authorize]
        public async Task<IActionResult> SearchMyMultipleChoice([FromQuery] FilterQuery query, CancellationToken ct)
        {
            var userId = _currentUserService.UserId;
            if (userId == null) return Unauthorized();
            return Ok(await _questionService.SearchMultipleChoiceQuestionsAsync(query, restrictToUserId: userId.Value, ct: ct));
        }

        [HttpGet("mine/truefalse/search")]
        [Authorize]
        public async Task<IActionResult> SearchMyTrueFalse([FromQuery] FilterQuery query, CancellationToken ct)
        {
            var userId = _currentUserService.UserId;
            if (userId == null) return Unauthorized();
            return Ok(await _questionService.SearchTrueFalseQuestionsAsync(query, restrictToUserId: userId.Value, ct: ct));
        }

        [HttpGet("mine/typetheanswer/search")]
        [Authorize]
        public async Task<IActionResult> SearchMyTypeTheAnswer([FromQuery] FilterQuery query, CancellationToken ct)
        {
            var userId = _currentUserService.UserId;
            if (userId == null) return Unauthorized();
            return Ok(await _questionService.SearchTypeTheAnswerQuestionsAsync(query, restrictToUserId: userId.Value, ct: ct));
        }

        // My Old legacy endpoints (should be deleted)

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
        //

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

            // Server-derived ownership: overwrites anything the client sent, so a
            // user can only ever see their own questions regardless of query params.
            filterParams.UserId = userId.Value;

            // Return full typed DTOs (with answer options, etc.) so the client can
            // render and edit them. The UserId filter set above is applied inside
            // each typed method via ApplyFilters.
            switch (filterParams.Type)
            {
                case QuestionType.MultipleChoice:
                {
                    var paged = await _questionService.GetPaginatedMultipleChoiceQuestionsAsync(filterParams);
                    Response.AddPaginationHeader(paged);
                    return Ok(paged.Items);
                }
                case QuestionType.TrueFalse:
                {
                    var paged = await _questionService.GetPaginatedTrueFalseQuestionsAsync(filterParams);
                    Response.AddPaginationHeader(paged);
                    return Ok(paged.Items);
                }
                case QuestionType.TypeTheAnswer:
                {
                    var paged = await _questionService.GetPaginatedTypeTheAnswerQuestionsAsync(filterParams);
                    Response.AddPaginationHeader(paged);
                    return Ok(paged.Items);
                }
                default:
                {
                    // No type specified — fall back to the lightweight base list.
                    var paged = await _questionService.GetPaginatedQuestionsAsync(filterParams);
                    Response.AddPaginationHeader(paged);
                    return Ok(paged.Items);
                }
            }
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
            await _auditService.LogAsync(
                AuditActions.QuestionCreated, "Question", createdQuestion.Id.ToString(),
                newValue: new { createdQuestion.Id, Type = "MultipleChoice" });
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
            await _auditService.LogAsync(
                AuditActions.QuestionCreated, "Question", createdQuestion.Id.ToString(),
                newValue: new { createdQuestion.Id, Type = "TrueFalse" });
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
            await _auditService.LogAsync(
                AuditActions.QuestionCreated, "Question", createdQuestion.Id.ToString(),
                newValue: new { createdQuestion.Id, Type = "TypeTheAnswer" });
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

            if (result == null) return NotFound();
            await _auditService.LogAsync(
                AuditActions.QuestionUpdated, "Question", id.ToString(),
                newValue: new { Type = "MultipleChoice", OwnerId = ownerId, ByOwner = ownerId == userId.Value });
            return NoContent();
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

            if (result == null) return NotFound();
            await _auditService.LogAsync(
                AuditActions.QuestionUpdated, "Question", id.ToString(),
                newValue: new { Type = "TrueFalse", OwnerId = ownerId, ByOwner = ownerId == userId.Value });
            return NoContent();
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

            if (result == null) return NotFound();
            await _auditService.LogAsync(
                AuditActions.QuestionUpdated, "Question", id.ToString(),
                newValue: new { Type = "TypeTheAnswer", OwnerId = ownerId, ByOwner = ownerId == userId.Value });
            return NoContent();
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

            if (!success)
                return HandleCustomError(errorMessage, isCustomMessage);

            await _auditService.LogAsync(
                AuditActions.QuestionDeleted, "Question", id.ToString(),
                oldValue: new { OwnerId = ownerId, ByOwner = ownerId == userId.Value });

            return Ok(new { success = true, message = "Question deleted successfully." });
        }
    }
}