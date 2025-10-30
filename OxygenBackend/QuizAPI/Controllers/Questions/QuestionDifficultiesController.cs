using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
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
    public class QuestionDifficultiesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public QuestionDifficultiesController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // GET: api/QuestionDifficulties
        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuestionDifficultyDTO>>> GetQuestionDifficulties()
        {
            var questionDifficulties = await _context.QuestionDifficulties
                .Select(qd => new QuestionDifficultyDTO
                {
                    ID = qd.ID,
                    Level = qd.Level,
                    Weight = qd.Weight,
                    CreatedAt = qd.CreatedAt,
                    Username = qd.User.Username
                })
                .ToListAsync();
            return Ok(questionDifficulties);
        }

        // GET: api/QuestionDifficulties/5
        [HttpGet("{id}")]
        public async Task<ActionResult<QuestionDifficulty>> GetQuestionDifficulty(int id)
        {
            var questionDifficulty = await _context.QuestionDifficulties.FindAsync(id);

            if (questionDifficulty == null)
            {
                return NotFound();
            }

            return questionDifficulty;
        }

        // PUT: api/QuestionDifficulties/5
        [HttpPut("{id}")]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<IActionResult> PutQuestionDifficulty(int id, QuestionDifficulty questionDifficulty)
        {
            if (!_currentUserService.IsAdmin)
            {
                return Forbid();
            }

            if (id != questionDifficulty.ID)
            {
                return BadRequest();
            }

            _context.Entry(questionDifficulty).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!QuestionDifficultyExists(id))
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

        // POST: api/QuestionDifficulties
        [HttpPost]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<ActionResult<QuestionDifficulty>> PostQuestionDifficulty(QuestionDifficultyCM questionDifficulty)
        {
            var userId = _currentUserService.UserId;

            if (userId == null)
            {
                return Unauthorized(new { message = "User ID not found in token." });
            }

            var qDifficulty = new QuestionDifficulty
            {
                Level = questionDifficulty.Level,
                Weight = questionDifficulty.Weight,
                CreatedAt = DateTime.UtcNow,
                UserId = userId.Value // Use .Value because the service returns a nullable Guid
            };

            _context.QuestionDifficulties.Add(qDifficulty);
            await _context.SaveChangesAsync();

            // Return a DTO or use CreatedAtAction for better REST compliance
            return Ok(qDifficulty);
        }

        // DELETE: api/QuestionDifficulties/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "SuperAdmin")]

        public async Task<IActionResult> DeleteQuestionDifficulty(int id)
        {
            if (!_currentUserService.IsAdmin)
            {
                return Forbid();
            }

            var questionDifficulty = await _context.QuestionDifficulties.FindAsync(id);
            if (questionDifficulty == null)
            {
                return NotFound();
            }

            _context.QuestionDifficulties.Remove(questionDifficulty);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool QuestionDifficultyExists(int id)
        {
            return (_context.QuestionDifficulties?.Any(e => e.ID == id)).GetValueOrDefault();
        }
    }
}