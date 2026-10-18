using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Extensions;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.DTOs.Quiz;
// AppException & friends: the catches below deliberately let these through to
// GlobalExceptionHandler, which maps each to its own status code and a ProblemDetails
// body. Swallowing one into HandleCustomError turns a precise 400 into an opaque 500.
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Services.Audit;
using QuizAPI.Filtering;

namespace QuizAPI.Controllers.Quizzes
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuizController : BaseApiController
    {
        private readonly IQuizService _quizService;
        private readonly ILogger<QuizController> _logger;
        private readonly ICurrentUserService _currentUser;
        private readonly IAuditService _auditService;

        public QuizController(
            IQuizService quizService,
            ILogger<QuizController> logger,
            ICurrentUserService currentUser,
            IAuditService auditService)
        {
            _quizService = quizService ?? throw new ArgumentNullException(nameof(quizService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _currentUser = currentUser ?? throw new ArgumentNullException(nameof(currentUser));
            _auditService = auditService ?? throw new ArgumentNullException(nameof(auditService));
        }

        /// <summary>
        /// Get all quizzes (admin only)
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin, SuperAdmin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> GetAllQuizzes([FromQuery] QuizFilterParams filterParams)
        {
            try
            {
                var pagedQuizzes = await _quizService.GetAllQuizzesAsync(filterParams);
                Response.AddPaginationHeader(
                    pagedQuizzes.PageNumber,
                    pagedQuizzes.PageSize,
                    pagedQuizzes.TotalCount,
                    pagedQuizzes.TotalPages,
                    pagedQuizzes.HasNextPage,
                    pagedQuizzes.HasPreviousPage
                );
                return Ok(pagedQuizzes.Items);
            }
            catch (Exception ex) when (ex is not AppException)
            {
                _logger.LogError(ex, "Error retrieving all quizzes");
                return HandleCustomError("An error occurred while processing your request", false);
            }
        }
        /// <summary>
        /// Get all public quizzes
        /// </summary>
        [HttpGet("public")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPublicQuizzes([FromQuery] QuizFilterParams filterParams)
        {
            try
            {
                // Add pagination support for public endpoint too
                var pagedQuizzes = await _quizService.GetPublicQuizzesAsync(filterParams);
                Response.AddPaginationHeader(
                    pagedQuizzes.PageNumber,
                    pagedQuizzes.PageSize,
                    pagedQuizzes.TotalCount,
                    pagedQuizzes.TotalPages,
                    pagedQuizzes.HasNextPage,
                    pagedQuizzes.HasPreviousPage
                );
                return Ok(pagedQuizzes.Items);
            }
            catch (Exception ex) when (ex is not AppException)
            {
                _logger.LogError(ex, "Error retrieving public quizzes");
                return HandleCustomError("An error occurred while processing your request", false);
            }
        }

        /// <summary>
        /// Get quizzes created by the current user
        /// </summary>
        [HttpGet("my")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetMyQuizzes([FromQuery] QuizFilterParams filterParams)
        {
            try
            {
                var userId = GetCurrentUserId();
                var pagedQuizzes = await _quizService.GetQuizzesByUserAsync(userId, filterParams);
                Response.AddPaginationHeader(
                    pagedQuizzes.PageNumber,
                    pagedQuizzes.PageSize,
                    pagedQuizzes.TotalCount,
                    pagedQuizzes.TotalPages,
                    pagedQuizzes.HasNextPage,
                    pagedQuizzes.HasPreviousPage
                );
                return Ok(pagedQuizzes.Items);
            }
            catch (Exception ex) when (ex is not AppException)
            {
                _logger.LogError(ex, "Error retrieving user's quizzes");
                return HandleCustomError("An error occurred while processing your request", false);
            }
        }

        // ── SEARCH (shared filtering framework — see docs/quiz/filtering.md) ──────────
        // Three scopes mirroring the list endpoints above, all returning the standard
        // PagedResponse body envelope:
        //   GET /api/quiz/search       public catalogue (active + published)
        //   GET /api/quiz/mine/search  the caller's own quizzes
        //   GET /api/quiz/all/search   everything (admin)
        // Example:
        //   /api/quiz/search?search=history&filter=categoryId:in:3,4&sort=createdAt:desc&page=1&pageSize=12

        [HttpGet("search")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> SearchPublicQuizzes([FromQuery] FilterQuery query, CancellationToken ct)
        {
            var result = await _quizService.SearchQuizzesAsync(query, publicOnly: true, ct: ct);
            return Ok(result);
        }

        [HttpGet("mine/search")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> SearchMyQuizzes([FromQuery] FilterQuery query, CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var result = await _quizService.SearchQuizzesAsync(query, restrictToUserId: userId, ct: ct);
            return Ok(result);
        }

        [HttpGet("all/search")]
        [Authorize(Roles = "Admin, SuperAdmin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> SearchAllQuizzes(
            [FromQuery] FilterQuery query,
            [FromQuery] bool includeDeleted,
            CancellationToken ct)
        {
            // includeDeleted is admin-only (this endpoint is already role-gated) and surfaces
            // soft-deleted quizzes so they can be reviewed from the management table.
            var result = await _quizService.SearchQuizzesAsync(query, includeDeleted: includeDeleted, ct: ct);
            return Ok(result);
        }

        /// <summary>
        /// Get a specific quiz by ID. A Public quiz is readable by anyone; a Draft or Unlisted one
        /// only by its owner, an admin, or — Unlisted only — a caller holding its share token.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetQuizById(int id, [FromQuery] string? shareToken = null)
        {
            try
            {
                // Pass the caller so the owner's read carries the Unlisted ShareToken.
                var currentUserId = _currentUser.UserId;
                var quiz = await _quizService.GetQuizByIdAsync(id, currentUserId);

                if (quiz == null)
                {
                    return NotFound();
                }

                // Only Public is open. This used to refuse Draft alone, and quiz ids are sequential,
                // so counting upward read every Unlisted quiz — which is meant to need the link
                // (docs/quiz/quiz-visibility.md). 404, not 403: a non-owner learns nothing about
                // whether the id exists.
                if (!IsPublic(quiz) && !IsOwnerOrAdmin(quiz) && !await HoldsShareTokenAsync(quiz, shareToken))
                {
                    return NotFound();
                }

                return Ok(quiz);
            }
            catch (Exception ex) when (ex is not AppException)
            {
                _logger.LogError(ex, "Error retrieving quiz {QuizId}", id);
                return HandleCustomError("An error occurred while processing your request", false);
            }
        }

        /// <summary>
        /// Get quiz questions
        /// </summary>
        [HttpGet("{id}/questions")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetQuizQuestions(int id)
        {
            try
            {
                // <b>Owner or admin only, whatever the status.</b> This is the authoring view: each
                // question with its answer options and which are correct. It used to refuse only a
                // Draft, so any Public quiz's answer key was one anonymous GET away (and any Unlisted
                // one, by counting ids). Its only client is the owner/admin quiz page and the
                // editors; play never reads it — a session serves questions one at a time without
                // the answers. 404 for everyone else, so the id's existence isn't confirmed either.
                var quiz = await _quizService.GetQuizByIdAsync(id);
                if (quiz == null || !IsOwnerOrAdmin(quiz))
                {
                    return NotFound();
                }

                // If authorized, get the questions
                var questions = await _quizService.GetQuizQuestionsAsync(id);
                return Ok(questions ?? new List<QuizQuestionDTO>());
            }
            catch (Exception ex) when (ex is not AppException)
            {
                _logger.LogError(ex, "Error retrieving questions for quiz {QuizId}", id);
                return HandleCustomError("An error occurred while processing your request", false);
            }
        }

        /// <summary>
        /// Create a new quiz
        /// </summary>
        [HttpPost]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CreateQuiz([FromBody] QuizCM quizCM)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userId = GetCurrentUserId();
                var createdQuiz = await _quizService.CreateQuizAsync(userId, quizCM);

                await _auditService.LogAsync(
                    AuditActions.QuizCreated, "Quiz", createdQuiz.Id.ToString(),
                    newValue: new { createdQuiz.Id });

                return CreatedAtAction(nameof(GetQuizById), new { id = createdQuiz.Id }, createdQuiz);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid operation during quiz creation");
                return BadRequest(ex.Message);
            }
            catch (Exception ex) when (ex is not AppException)
            {
                _logger.LogError(ex, "Error creating quiz");
                return HandleCustomError("An error occurred while processing your request", false);
            }
        }

        /// <summary>
        /// Create a quiz and all of its questions atomically (AI-assisted flow). The questions are
        /// created Private and inherit the quiz's category/language. If anything fails, the whole
        /// import rolls back — no orphan questions are left behind. See docs/quiz/ai-quiz-architecture.md.
        /// </summary>
        [HttpPost("ai-import")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CreateAiQuiz([FromBody] AiQuizImportCM importCM)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userId = GetCurrentUserId();
                var createdQuiz = await _quizService.CreateAiQuizAsync(userId, importCM);

                await _auditService.LogAsync(
                    AuditActions.QuizCreated, "Quiz", createdQuiz.Id.ToString(),
                    newValue: new { createdQuiz.Id, Source = "AiImport" });

                return CreatedAtAction(nameof(GetQuizById), new { id = createdQuiz.Id }, createdQuiz);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid operation during AI quiz import");
                return BadRequest(ex.Message);
            }
            catch (Exception ex) when (ex is not AppException)
            {
                _logger.LogError(ex, "Error importing AI quiz");
                return HandleCustomError("An error occurred while processing your request", false);
            }
        }

        /// <summary>
        /// Update an existing quiz
        /// </summary>
        [HttpPut]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateQuiz([FromBody] QuizUM quizUM)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userId = GetCurrentUserId();
                var updatedQuiz = await _quizService.UpdateQuizAsync(userId, quizUM);

                if (updatedQuiz == null)
                {
                    return NotFound();
                }

                await _auditService.LogAsync(
                    AuditActions.QuizUpdated, "Quiz", quizUM.Id.ToString());

                return Ok(updatedQuiz);
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict("The quiz has been modified by another user. Please refresh and try again.");
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid operation during quiz update");
                return BadRequest(ex.Message);
            }
            catch (Exception ex) when (ex is not AppException)
            {
                _logger.LogError(ex, "Error updating quiz {QuizId}", quizUM.Id);
                return HandleCustomError("An error occurred while processing your request", false);
            }
        }

        /// <summary>
        /// Sets a quiz's status (Draft / Unlisted / Public). Owner-only.
        /// </summary>
        [HttpPatch("{id}/status")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> SetStatus(int id, [FromBody] SetQuizStatusRequest request)
        {
            if (!Enum.TryParse<QuizStatus>(request.Status, ignoreCase: true, out var status))
                return BadRequest("Status must be one of: Draft, Unlisted, Public.");

            try
            {
                var userId = GetCurrentUserId();
                var quiz = await _quizService.SetQuizStatusAsync(userId, id, status);

                if (quiz == null)
                {
                    return NotFound();
                }

                return Ok(quiz);
            }
            catch (Exception ex) when (ex is not AppException)
            {
                _logger.LogError(ex, "Error setting status for quiz {QuizId}", id);
                return HandleCustomError("An error occurred while processing your request", false);
            }
        }

        /// <summary>
        /// Generates (or returns the existing) share link token for an owned quiz so it can be
        /// played while Unlisted. Owner-only.
        /// </summary>
        [HttpPost("{id}/share-link")]
        [Authorize]
        [ProducesResponseType(typeof(ShareLinkResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CreateShareLink(int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                var token = await _quizService.GenerateShareTokenAsync(userId, id);

                if (token == null)
                {
                    return NotFound();
                }

                return Ok(new ShareLinkResponse { ShareToken = token });
            }
            catch (Exception ex) when (ex is not AppException)
            {
                _logger.LogError(ex, "Error generating share link for quiz {QuizId}", id);
                return HandleCustomError("An error occurred while processing your request", false);
            }
        }

        /// <summary>
        /// Resolves a quiz from its Unlisted share token. Login is required (the token grants
        /// access, the account ties the play to a user). Returns 404 for an unknown/Draft token.
        /// </summary>
        [HttpGet("shared/{token}")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetSharedQuiz(string token)
        {
            try
            {
                var quiz = await _quizService.GetQuizByShareTokenAsync(token);
                return quiz == null ? NotFound() : Ok(quiz);
            }
            catch (Exception ex) when (ex is not AppException)
            {
                _logger.LogError(ex, "Error retrieving shared quiz");
                return HandleCustomError("An error occurred while processing your request", false);
            }
        }

        [HttpDelete("{id}")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteQuiz(int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                var deleted = await _quizService.DeleteQuizAsync(userId, id, _currentUser.IsAdmin);

                if (!deleted)
                {
                    return NotFound();
                }

                await _auditService.LogAsync(
                    AuditActions.QuizDeleted, "Quiz", id.ToString());

                return NoContent();
            }
            catch (Exception ex) when (ex is not AppException)
            {
                _logger.LogError(ex, "Error deleting quiz {QuizId}", id);
                return HandleCustomError("An error occurred while processing your request", false);
            }
        }

        /// <summary>
        /// Helper method to get the current user's ID
        /// </summary>
        private Guid GetCurrentUserId() =>
            _currentUser.UserId
            ?? throw new InvalidOperationException("User ID not found or invalid");

        private static bool IsPublic(QuizDTO quiz) =>
            string.Equals(quiz.Status, nameof(QuizStatus.Public), StringComparison.OrdinalIgnoreCase);

        private bool IsOwnerOrAdmin(QuizDTO quiz) =>
            _currentUser.IsAdmin || (_currentUser.UserId is { } uid && quiz.User?.Id == uid);

        /// <summary>
        /// The share-link grant, for reading an Unlisted quiz by id. Resolved through the same lookup
        /// as <c>GET shared/{token}</c>, so a token works here exactly when it works there (never for
        /// a Draft) and the token never has to leave the service.
        /// </summary>
        private async Task<bool> HoldsShareTokenAsync(QuizDTO quiz, string? shareToken)
        {
            if (string.IsNullOrWhiteSpace(shareToken)) return false;
            var shared = await _quizService.GetQuizByShareTokenAsync(shareToken);
            return shared?.Id == quiz.Id;
        }
    }
}