using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.Models;
using QuizAPI.Services.CurrentUserService;
using System.Security.Claims;

namespace QuizAPI.Controllers.Questions
{
    [Route("api/[controller]")]
    [ApiController]
    public class QuestionLanguagesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;


        public QuestionLanguagesController(ApplicationDbContext context, ICurrentUserService userService)
        {
            _currentUserService = userService;
            _context = context;
        }

        // GET: api/QuestionLanguages
        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuestionLanguage>>> GetQuestionLanguages()
        {
          if (_context.QuestionLanguages == null)
          {
              return NotFound();
          }

            var qLanguages = await _context.QuestionLanguages.Select(ql => new QuestionLanguageDTO
            {
                ID = ql.Id,
                Language = ql.Language,
                CreatedAt = ql.CreatedAt,
                Username = ql.User.Username
            }).ToListAsync();

            return Ok(qLanguages);
        }

        // GET: api/QuestionLanguages/5
        [HttpGet("{id}")]
        public async Task<ActionResult<QuestionLanguage>> GetQuestionLanguage(int id)
        {
          if (_context.QuestionLanguages == null)
          {
              return NotFound();
          }
            var questionLanguage = await _context.QuestionLanguages.FindAsync(id);

            if (questionLanguage == null)
            {
                return NotFound();
            }

            return questionLanguage;
        }

        // PUT: api/QuestionLanguages/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> PutQuestionLanguage(int id, QuestionLanguage questionLanguage)
        {
            if (id != questionLanguage.Id)
            {
                return BadRequest();
            }

            _context.Entry(questionLanguage).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!QuestionLanguageExists(id))
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

        [HttpPost]
        public async Task<ActionResult<QuestionLanguage>> PostQuestionLanguage(QuestionLanguageCM questionLanguage)
        {
          if (_context.QuestionLanguages == null)
          {
              return Problem("Entity set 'ApplicationDbContext.QuestionLanguages'  is null.");
          }

            var userId = _currentUserService.UserId;

            if (userId == null)
            {
                return Unauthorized(new { message = "User ID not found in token." });
            }

            var qLanguage = new QuestionLanguage
            {
                Language = questionLanguage.Language,
                UserId = userId.Value,
                CreatedAt = DateTime.UtcNow
            };

            _context.QuestionLanguages.Add(qLanguage);
            await _context.SaveChangesAsync();

            return Ok(questionLanguage);
        }

        // DELETE: api/QuestionLanguages/5
        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteQuestionLanguage(int id)
        {
            if (_context.QuestionLanguages == null)
            {
                return NotFound();
            }
            var questionLanguage = await _context.QuestionLanguages.FindAsync(id);
            if (questionLanguage == null)
            {
                return NotFound();
            }

            _context.QuestionLanguages.Remove(questionLanguage);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool QuestionLanguageExists(int id)
        {
            return (_context.QuestionLanguages?.Any(e => e.Id == id)).GetValueOrDefault();
        }
    }
}
