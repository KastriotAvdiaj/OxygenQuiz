using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.Models;
using QuizAPI.Services.CurrentUserService; 

namespace QuizAPI.Controllers.Questions
{
    [Route("api/[controller]")]
    [ApiController]
    public class QuestionCategoriesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUserService;

        public QuestionCategoriesController(ApplicationDbContext context, IMapper mapper, ICurrentUserService currentUserService)
        {
            _context = context;
            _mapper = mapper;
            _currentUserService = currentUserService;
        }

        // GET: api/QuestionCategories
        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuestionCategoryDTO>>> GetQuestionCategories()
        {
            var questionCategories = await _context.QuestionCategories
                .Select(qc => new QuestionCategoryDTO
                {
                    Id = qc.Id,
                    Name = qc.Name,
                    Username = qc.User.Username, 
                    ColorPaletteJson = qc.ColorPaletteJson,
                    CreatedAt = qc.CreatedAt
                })
                .ToListAsync();

            return Ok(questionCategories);
        }

        // GET: api/QuestionCategories/5
        // Returns a single universal category. No ownership check is needed.
        [HttpGet("{id}")]
        public async Task<ActionResult<QuestionCategory>> GetQuestionCategory(int id)
        {
            var questionCategory = await _context.QuestionCategories.FindAsync(id);

            if (questionCategory == null)
            {
                return NotFound();
            }

            return questionCategory;
        }

        // PUT: api/QuestionCategories/5
        // Updates a universal category. Only an admin should be able to do this.
        [HttpPut("{id}")]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<IActionResult> PutQuestionCategory(int id, QuestionCategoryCM questionCategory)
        {
            if (!_currentUserService.IsAdmin)
            {
                return Forbid(); 
            }

            var category = await _context.QuestionCategories.FindAsync(id);

            if (category == null)
            {
                return NotFound(new { message = "Category not found." });
            }

            _mapper.Map(questionCategory, category);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // POST: api/QuestionCategories
        [HttpPost]
        [Authorize(Roles = "SuperAdmin, Admin")]

        public async Task<ActionResult<QuestionCategoryDTO>> PostQuestionCategory(QuestionCategoryCM questionCategory)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = _currentUserService.UserId;

            if (userId == null)
            {
                // This safeguard is still useful in case the token is valid but missing the claim.
                return Unauthorized(new { message = "User ID not found in token." });
            }

            var category = _mapper.Map<QuestionCategory>(questionCategory);
            category.UserId = userId.Value; 
            category.CreatedAt = DateTime.UtcNow;

            _context.QuestionCategories.Add(category);
            await _context.SaveChangesAsync();

            var dto = _mapper.Map<QuestionCategoryDTO>(category);
            return CreatedAtAction(nameof(GetQuestionCategory), new { id = category.Id }, dto);
        }

        // DELETE: api/QuestionCategories/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> DeleteQuestionCategory(int id)
        {
            // REFACTOR: 7. Use the service for a consistent authorization check.
            if (!_currentUserService.IsAdmin)
            {
                return Forbid();
            }

            var questionCategory = await _context.QuestionCategories.FindAsync(id);
            if (questionCategory == null)
            {
                return NotFound();
            }

            _context.QuestionCategories.Remove(questionCategory);
            await _context.SaveChangesAsync();

            return NoContent();
        }

    }
}