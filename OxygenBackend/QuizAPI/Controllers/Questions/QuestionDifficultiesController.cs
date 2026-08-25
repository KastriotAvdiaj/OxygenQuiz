using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.DTOs.Question;
using QuizAPI.Exceptions;
using QuizAPI.Mapping;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.CurrentUserService;

namespace QuizAPI.Controllers.Questions
{
    /// <summary>
    /// CRUD for question difficulties. Same shape as
    /// <see cref="QuestionCategoriesController"/> — read that one first; the reasoning for the
    /// missing service layer and the public/admin read split lives there.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class QuestionDifficultiesController : ControllerBase
    {
        private readonly IQuestionDifficultyRepository _difficulties;
        private readonly ICurrentUserService _currentUserService;

        public QuestionDifficultiesController(
            IQuestionDifficultyRepository difficulties, ICurrentUserService currentUserService)
        {
            _difficulties = difficulties;
            _currentUserService = currentUserService;
        }

        /// <summary>Every difficulty. Anonymous — guests need these to browse and play.</summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuestionDifficultyDTO>>> GetQuestionDifficulties(
            CancellationToken ct) => Ok(await _difficulties.GetAllAsync(ct));

        /// <summary>
        /// The same list plus who created each row, for the dashboard's difficulties table.
        ///
        /// <para>A separate endpoint rather than a field on the public list: the creator is admin
        /// metadata, and the public list is embedded in anonymous responses. Unlike categories
        /// there is no filter/paging framework wired up here yet, so this is a plain list rather
        /// than a <c>/search</c>.</para>
        /// </summary>
        [HttpGet("admin")]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<ActionResult<IEnumerable<QuestionDifficultyAdminDTO>>> GetForAdmin(
            CancellationToken ct) => Ok(await _difficulties.GetAllForAdminAsync(ct));

        [HttpGet("{id}")]
        public async Task<ActionResult<QuestionDifficultyDTO>> GetQuestionDifficulty(
            int id, CancellationToken ct)
        {
            var difficulty = await _difficulties.GetByIdAsync(id, ct);

            if (difficulty is null) throw new NotFoundException("Difficulty not found.");

            return Ok(difficulty);
        }

        /// <summary>
        /// Update a difficulty. Admins only.
        ///
        /// <para><b>Takes a <see cref="QuestionDifficultyCM"/>, not the entity.</b> This action
        /// used to accept a <c>QuestionDifficulty</c> and mark it <c>EntityState.Modified</c>,
        /// which let a caller set <c>UserId</c> and <c>CreatedAt</c> — every column on the row
        /// was writable from the request body. The create model exposes exactly the two fields
        /// that are meant to be editable.</para>
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<IActionResult> PutQuestionDifficulty(
            int id, QuestionDifficultyCM model, CancellationToken ct)
        {
            var difficulty = await _difficulties.GetTrackedByIdAsync(id, ct);

            if (difficulty is null) throw new NotFoundException("Difficulty not found.");

            if (await _difficulties.LevelExistsAsync(model.Level, excludeId: id, ct))
                throw new ConflictException($"A difficulty called \"{model.Level.Trim()}\" already exists.");

            difficulty.Level = model.Level;
            difficulty.Weight = model.Weight;

            await _difficulties.SaveChangesAsync(ct);

            return NoContent();
        }

        /// <summary>Create a difficulty. Admins only. Returns the DTO, not the entity.</summary>
        [HttpPost]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<ActionResult<QuestionDifficultyDTO>> PostQuestionDifficulty(
            QuestionDifficultyCM model, CancellationToken ct)
        {
            var userId = _currentUserService.UserId
                ?? throw new UnauthorizedException("User ID not found in token.");

            if (await _difficulties.LevelExistsAsync(model.Level, excludeId: null, ct))
                throw new ConflictException($"A difficulty called \"{model.Level.Trim()}\" already exists.");

            var difficulty = new QuestionDifficulty
            {
                Level = model.Level,
                Weight = model.Weight,
                CreatedAt = DateTime.UtcNow,
                UserId = userId,
            };

            await _difficulties.AddAsync(difficulty, ct);
            await _difficulties.SaveChangesAsync(ct);

            return CreatedAtAction(
                nameof(GetQuestionDifficulty), new { id = difficulty.ID }, difficulty.ToDto());
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> DeleteQuestionDifficulty(int id, CancellationToken ct)
        {
            var difficulty = await _difficulties.GetTrackedByIdAsync(id, ct);

            if (difficulty is null) throw new NotFoundException("Difficulty not found.");

            _difficulties.Remove(difficulty);
            await _difficulties.SaveChangesAsync(ct);

            return NoContent();
        }
    }
}
