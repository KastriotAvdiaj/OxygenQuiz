
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using System.Text.Json;
using QuizAPI.Models;
using AutoMapper;

namespace QuizAPI.Controllers.Questions
{
    [Route("api/[controller]")]
    [ApiController]
    public class QuestionCategoriesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IMapper _mapper;


        public QuestionCategoriesController(ApplicationDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        // GET: api/QuestionCategories
        [HttpGet]
        [Authorize]
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

            if (category == null)
            {
                return NotFound(new { message = "Category not found." });
            }

            // Map CM to existing entity, excluding UserId and CreatedAt
            _mapper.Map(questionCategory, category);

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
        public async Task<ActionResult<QuestionCategoryDTO>> PostQuestionCategory(QuestionCategoryCM questionCategory)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim))
            {
                return Unauthorized(new { message = "User ID not found in token." });
            }

            var userId = Guid.Parse(userIdClaim);

            // AutoMapper handles mapping + ColorPaletteJson serialization
            var category = _mapper.Map<QuestionCategory>(questionCategory);
            category.UserId = userId;
            category.CreatedAt = DateTime.UtcNow;

            _context.QuestionCategories.Add(category);
            await _context.SaveChangesAsync();

            var dto = _mapper.Map<QuestionCategoryDTO>(category);
            return CreatedAtAction(nameof(GetQuestionCategory), new { id = category.Id }, dto);
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
