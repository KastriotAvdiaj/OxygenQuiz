using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Extensions;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models;
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
            catch (Exception ex)
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
            catch (Exception ex)
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user's quizzes");
                return HandleCustomError("An error occurred while processing your request", false);
            }
        }

        // ── SEARCH (shared filtering framework — see docs/filtering.md) ──────────
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
        /// Get a specific quiz by ID
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetQuizById(int id)
        {
            try
            {
                var quiz = await _quizService.GetQuizByIdAsync(id);

                if (quiz == null)
                {
                    return NotFound();
                }

                if (!quiz.IsPublished && !User.IsInRole("Admin"))
                {
                    if (!User.Identity.IsAuthenticated)
                    {
                        return NotFound(); // Don't reveal existence to anonymous users
                    }

                    var userId = GetCurrentUserId();
                    if (quiz.User.Id.ToString() != userId.ToString())
                    {
                        return NotFound(); // Don't reveal existence to non-owners
                    }
                }

                return Ok(quiz);
            }
            catch (Exception ex)
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
                // First get quiz to check permissions (reusing existing logic)
                var quiz = await _quizService.GetQuizByIdAsync(id);
                if (quiz == null)
                {
                    return Unauthorized();
                }

                // Apply same authorization logic as GetQuizById
                if (!quiz.IsPublished && !User.IsInRole("Admin"))
                {
                    if (!User.Identity.IsAuthenticated)
                    {
                        return Unauthorized();
                    }
                    var userId = GetCurrentUserId();
                    if (quiz.User.Id.ToString() != userId.ToString())
                    {
                        return Forbid();
                    }
                }

                // If authorized, get the questions
                var questions = await _quizService.GetQuizQuestionsAsync(id);
                return Ok(questions ?? new List<QuizQuestionDTO>());
            }
            catch (Exception ex)
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating quiz");
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating quiz {QuizId}", quizUM.Id);
                return HandleCustomError("An error occurred while processing your request", false);
            }
        }

        /// <summary>
        /// Toggle the publish status of a quiz
        /// </summary>
        [HttpPatch("{id}/publish-status")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> TogglePublishStatus(int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                var quiz = await _quizService.ToggleQuizPublishStatusAsync(userId, id);

                if (quiz == null)
                {
                    return NotFound();
                }

                return Ok(quiz);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling publish status for quiz {QuizId}", id);
                return HandleCustomError("An error occurred while processing your request", false);
            }
        }

        /// <summary>
        /// Toggle the active status of a quiz
        /// </summary>
        [HttpPatch("{id}/active-status")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ToggleActiveStatus(int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                var quiz = await _quizService.ToggleQuizActiveStatusAsync(userId, id);

                if (quiz == null)
                {
                    return NotFound();
                }

                return Ok(quiz);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling active status for quiz {QuizId}", id);
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
            catch (Exception ex)
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
    }
}