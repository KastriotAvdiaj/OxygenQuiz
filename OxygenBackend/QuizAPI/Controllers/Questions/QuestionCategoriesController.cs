using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.DTOs.Question;
using QuizAPI.Exceptions;
using QuizAPI.Filtering;
using QuizAPI.Mapping;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.CurrentUserService;

namespace QuizAPI.Controllers.Questions
{
    /// <summary>
    /// CRUD for question categories.
    ///
    /// <para><b>No service layer, deliberately.</b> Every action here is one HTTP shape plus one
    /// data access, with no rule in between that could change independently of either — so a
    /// service would be a class whose methods forward a single call and return. The rule that
    /// matters is that nothing outside a repository touches <c>DbContext</c>, and a controller
    /// calling a repository satisfies it. A service arrives when a real rule does; the AI
    /// palette proposer is the first one queued (docs/entities/category-palettes.md).</para>
    ///
    /// <para><b>Reads are anonymous on purpose.</b> Guests browse and play quizzes, and that
    /// needs category names — gating these would break guest play (docs/auth/guest-play.md).
    /// What changed is what they return: <see cref="QuestionCategoryDTO"/> no longer carries
    /// the creator's username. <c>GET /search</c> does, and is therefore role-gated.</para>
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class QuestionCategoriesController : ControllerBase
    {
        private readonly IQuestionCategoryRepository _categories;
        private readonly ICurrentUserService _currentUserService;

        public QuestionCategoriesController(
            IQuestionCategoryRepository categories, ICurrentUserService currentUserService)
        {
            _categories = categories;
            _currentUserService = currentUserService;
        }

        /// <summary>
        /// Every category. Anonymous — this feeds the quiz filters, the create-quiz form and the
        /// vocabulary sent to the AI generator.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuestionCategoryDTO>>> GetQuestionCategories(
            CancellationToken ct) => Ok(await _categories.GetAllAsync(ct));

        /// <summary>
        /// Filtered + paginated, for the admin dashboard's table
        /// (shared filtering framework — see docs/quiz/filtering.md).
        /// Example: <c>GET /api/questioncategories/search?search=geo&amp;sort=name:asc</c>
        ///
        /// <para><b>Role-gated</b>, unlike the other reads, because this is the one projection
        /// that includes who created each row. It is called from exactly one place — the
        /// dashboard's category table.</para>
        /// </summary>
        [HttpGet("search")]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<IActionResult> Search([FromQuery] FilterQuery query, CancellationToken ct)
            => Ok(await _categories.SearchAsync(query, ct));

        /// <summary>
        /// One category. Categories are universal, so there is no ownership check.
        ///
        /// <para>Returns a DTO. It used to return the raw entity, which serialised
        /// <c>UserId</c> and whatever navigation properties EF had loaded — the same leak the
        /// username split closes, by a different route.</para>
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<QuestionCategoryDTO>> GetQuestionCategory(
            int id, CancellationToken ct)
        {
            var category = await _categories.GetByIdAsync(id, ct);

            if (category is null) throw new NotFoundException("Category not found.");

            return Ok(category);
        }

        /// <summary>Update a universal category. Admins only.</summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<IActionResult> PutQuestionCategory(
            int id, QuestionCategoryCM questionCategory, CancellationToken ct)
        {
            var category = await _categories.GetTrackedByIdAsync(id, ct);

            if (category is null) throw new NotFoundException("Category not found.");

            if (await _categories.NameExistsAsync(questionCategory.Name, excludeId: id, ct))
                throw new ConflictException($"A category called \"{questionCategory.Name.Trim()}\" already exists.");

            questionCategory.ApplyTo(category);
            await _categories.SaveChangesAsync(ct);

            return NoContent();
        }

        /// <summary>Create a universal category. Admins only.</summary>
        [HttpPost]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<ActionResult<QuestionCategoryDTO>> PostQuestionCategory(
            QuestionCategoryCM questionCategory, CancellationToken ct)
        {
            // [ApiController] already short-circuits an invalid model into a 400 ProblemDetails
            // before the action runs, so an explicit ModelState check here is unreachable.

            var userId = _currentUserService.UserId
                // Still worth guarding: the token can be valid and missing the claim, which is a
                // different failure from "not signed in" and used to return a bare 401 body.
                ?? throw new UnauthorizedException("User ID not found in token.");

            if (await _categories.NameExistsAsync(questionCategory.Name, excludeId: null, ct))
                throw new ConflictException($"A category called \"{questionCategory.Name.Trim()}\" already exists.");

            var category = questionCategory.ToEntity();
            category.UserId = userId;
            category.CreatedAt = DateTime.UtcNow;

            await _categories.AddAsync(category, ct);
            await _categories.SaveChangesAsync(ct);

            return CreatedAtAction(
                nameof(GetQuestionCategory), new { id = category.Id }, category.ToDto());
        }

        /// <summary>Delete a category. SuperAdmin only.</summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> DeleteQuestionCategory(int id, CancellationToken ct)
        {
            var category = await _categories.GetTrackedByIdAsync(id, ct);

            if (category is null) throw new NotFoundException("Category not found.");

            _categories.Remove(category);
            await _categories.SaveChangesAsync(ct);

            return NoContent();
        }
    }
}
