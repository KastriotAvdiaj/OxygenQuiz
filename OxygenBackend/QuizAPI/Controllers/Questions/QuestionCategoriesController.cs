
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using System.Text.Json;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Questions
{
    [Route("api/[controller]")]
    [ApiController]
    public class QuestionCategoriesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public QuestionCategoriesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/QuestionCategories
        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuestionCategoryDTO>>> GetQuestionCategories()
        {
            if (_context.QuestionCategories == null)
            {
                return NotFound();
            }

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
        [HttpGet("{id}")]
        public async Task<ActionResult<QuestionCategory>> GetQuestionCategory(int id)
        {
            if (_context.QuestionCategories == null)
            {
                return NotFound();
            }
            var questionCategory = await _context.QuestionCategories.FindAsync(id);

            if (questionCategory == null)
            {
                return NotFound();
            }

            return questionCategory;
        }

        // PUT: api/QuestionCategories/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
       /* [Authorize(Roles = "SuperAdmin")]*/
        [HttpPut("{id}")]
        public async Task<IActionResult> PutQuestionCategory(int id, QuestionCategoryCM questionCategory)
        {

            var category = await _context.QuestionCategories.FindAsync(id);

            if(category == null)
            {
                return NotFound();
            }

            _context.Entry(questionCategory).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!QuestionCategoryExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/QuestionCategories
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754

        [HttpPost]
        public async Task<ActionResult<QuestionCategory>> PostQuestionCategory(QuestionCategoryCM questionCategory)
        {
            if (_context.QuestionCategories == null)
            {
                return Problem("Entity set 'ApplicationDbContext.QuestionCategories'  is null.");
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID not found in token." });
            }

            var questionCategoryEntity = new QuestionCategory 
            { 
                Name = questionCategory.Name,
                UserId = Guid.Parse(userId),
                ColorPaletteJson = (questionCategory.ColorPalette != null && questionCategory.ColorPalette.Any())
                ? JsonSerializer.Serialize(questionCategory.ColorPalette)
                : null,
                CreatedAt = DateTime.UtcNow 
            };

            _context.QuestionCategories.Add(questionCategoryEntity);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetQuestionCategory", new { id = questionCategoryEntity.Id }, questionCategoryEntity);
        }

        // DELETE: api/QuestionCategories/5
        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteQuestionCategory(int id)
        {
            if (_context.QuestionCategories == null)
            {
                return NotFound();
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

        private bool QuestionCategoryExists(int id)
        {
            return (_context.QuestionCategories?.Any(e => e.Id == id)).GetValueOrDefault();
        }
    }
}
