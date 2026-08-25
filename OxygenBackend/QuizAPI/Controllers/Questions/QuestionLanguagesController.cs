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
    /// CRUD for question languages. Same shape as <see cref="QuestionCategoriesController"/>.
    ///
    /// <para><b>Create is now admin-gated.</b> It previously carried no <c>[Authorize]</c>
    /// attribute at all, and the class carries none either — so the only thing standing between
    /// an ordinary signed-in user and a new row in this lookup table was the null check on
    /// <c>UserId</c>. Categories and difficulties have always required an admin to create;
    /// languages did not, and nothing about languages makes them safer to seed. A lookup table
    /// any authenticated user can append to is one the AI generator will happily be handed as
    /// vocabulary.</para>
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class QuestionLanguagesController : ControllerBase
    {
        private readonly IQuestionLanguageRepository _languages;
        private readonly ICurrentUserService _currentUserService;

        public QuestionLanguagesController(
            IQuestionLanguageRepository languages, ICurrentUserService currentUserService)
        {
            _languages = languages;
            _currentUserService = currentUserService;
        }

        /// <summary>Every language. Anonymous — guests need these to browse and play.</summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuestionLanguageDTO>>> GetQuestionLanguages(
            CancellationToken ct) => Ok(await _languages.GetAllAsync(ct));

        /// <summary>The same list plus who created each row, for the dashboard's table.</summary>
        [HttpGet("admin")]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<ActionResult<IEnumerable<QuestionLanguageAdminDTO>>> GetForAdmin(
            CancellationToken ct) => Ok(await _languages.GetAllForAdminAsync(ct));

        [HttpGet("{id}")]
        public async Task<ActionResult<QuestionLanguageDTO>> GetQuestionLanguage(
            int id, CancellationToken ct)
        {
            var language = await _languages.GetByIdAsync(id, ct);

            if (language is null) throw new NotFoundException("Language not found.");

            return Ok(language);
        }

        /// <summary>
        /// Update a language. SuperAdmin only.
        ///
        /// <para>Takes a <see cref="QuestionLanguageCM"/> rather than the entity — see the note
        /// on <see cref="QuestionDifficultiesController.PutQuestionDifficulty"/>; this action had
        /// the same over-posting hole, and the scaffolded link to Microsoft's warning about it
        /// was sitting directly above the code that ignored it.</para>
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> PutQuestionLanguage(
            int id, QuestionLanguageCM model, CancellationToken ct)
        {
            var language = await _languages.GetTrackedByIdAsync(id, ct);

            if (language is null) throw new NotFoundException("Language not found.");

            if (await _languages.LanguageExistsAsync(model.Language, excludeId: id, ct))
                throw new ConflictException($"A language called \"{model.Language.Trim()}\" already exists.");

            language.Language = model.Language;

            await _languages.SaveChangesAsync(ct);

            return NoContent();
        }

        /// <summary>
        /// Create a language. Admins only — see the class note.
        ///
        /// <para>Returns the created DTO. It used to return the request model, so the caller
        /// never learned the new row's id.</para>
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<ActionResult<QuestionLanguageDTO>> PostQuestionLanguage(
            QuestionLanguageCM model, CancellationToken ct)
        {
            var userId = _currentUserService.UserId
                ?? throw new UnauthorizedException("User ID not found in token.");

            if (await _languages.LanguageExistsAsync(model.Language, excludeId: null, ct))
                throw new ConflictException($"A language called \"{model.Language.Trim()}\" already exists.");

            var language = new QuestionLanguage
            {
                Language = model.Language,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
            };

            await _languages.AddAsync(language, ct);
            await _languages.SaveChangesAsync(ct);

            return CreatedAtAction(
                nameof(GetQuestionLanguage), new { id = language.Id }, language.ToDto());
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> DeleteQuestionLanguage(int id, CancellationToken ct)
        {
            var language = await _languages.GetTrackedByIdAsync(id, ct);

            if (language is null) throw new NotFoundException("Language not found.");

            _languages.Remove(language);
            await _languages.SaveChangesAsync(ct);

            return NoContent();
        }
    }
}
