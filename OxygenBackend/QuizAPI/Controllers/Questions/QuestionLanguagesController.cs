using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Questions
{
    [Route("api/[controller]")]
    [ApiController]
    public class QuestionLanguagesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public QuestionLanguagesController(ApplicationDbContext context)
        {
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

        // POST: api/QuestionLanguages
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<QuestionLanguage>> PostQuestionLanguage(QuestionLanguageCM questionLanguage)
        {
          if (_context.QuestionLanguages == null)
          {
              return Problem("Entity set 'ApplicationDbContext.QuestionLanguages'  is null.");
          }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID not found in token." });
            }

            var qLanguage = new QuestionLanguage
            {
                Language = questionLanguage.Language,
                UserId = Guid.Parse(userId),
                CreatedAt = DateTime.UtcNow
            };

            _context.QuestionLanguages.Add(qLanguage);
            await _context.SaveChangesAsync();

            return Ok(questionLanguage);
        }

        // DELETE: api/QuestionLanguages/5
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
