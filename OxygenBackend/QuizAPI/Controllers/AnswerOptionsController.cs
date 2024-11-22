using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;

namespace QuizAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnswerOptionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AnswerOptionsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/AnswerOptions
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AnswerOption>>> GetAnswerOptions()
        {
            return await _context.AnswerOptions.ToListAsync();
        }

        // GET: api/AnswerOptions/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<AnswerOption>> GetAnswerOption(int id)
        {
            var answerOption = await _context.AnswerOptions.FindAsync(id);

            if (answerOption == null)
                return NotFound();

            return answerOption;
        }

        // POST: api/AnswerOptions
        [HttpPost]
        public async Task<ActionResult<AnswerOption>> CreateAnswerOption(AnswerOption answerOption)
        {
            var question = await _context.Questions.Include(q => q.AnswerOptions)
                                                   .FirstOrDefaultAsync(q => q.Id == answerOption.QuestionId);
            if (question == null)
                return BadRequest("Question does not exist.");

            var updatedOptions = question.AnswerOptions.Append(answerOption).ToList();
            if (!ValidateAnswerOptions(updatedOptions))
                return BadRequest("Each question must have at least one correct and one incorrect answer.");

            _context.AnswerOptions.Add(answerOption);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAnswerOption), new { id = answerOption.Id }, answerOption);
        }

        // PUT: api/AnswerOptions/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAnswerOption(int id, AnswerOption updatedAnswerOption)
        {
            if (id != updatedAnswerOption.Id)
                return BadRequest();

            var question = await _context.Questions.Include(q => q.AnswerOptions)
                                                   .FirstOrDefaultAsync(q => q.Id == updatedAnswerOption.QuestionId);
            if (question == null)
                return BadRequest("Question does not exist.");

            var otherOptions = question.AnswerOptions.Where(a => a.Id != id).ToList();
            var updatedOptions = otherOptions.Append(updatedAnswerOption).ToList();

            if (!ValidateAnswerOptions(updatedOptions))
                return BadRequest("Each question must have at least one correct and one incorrect answer.");

            _context.Entry(updatedAnswerOption).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!AnswerOptionExists(id))
                    return NotFound();
                else
                    throw;
            }

            return NoContent();
        }

        // DELETE: api/AnswerOptions/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAnswerOption(int id)
        {
            var answerOption = await _context.AnswerOptions.FindAsync(id);
            if (answerOption == null)
                return NotFound();

            var question = await _context.Questions.Include(q => q.AnswerOptions)
                                                   .FirstOrDefaultAsync(q => q.Id == answerOption.QuestionId);

            var remainingOptions = question.AnswerOptions.Where(a => a.Id != id).ToList();
            if (!ValidateAnswerOptions(remainingOptions))
                return BadRequest("Deleting this option would violate the rule of having at least one correct and one incorrect answer.");

            _context.AnswerOptions.Remove(answerOption);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool AnswerOptionExists(int id) => _context.AnswerOptions.Any(e => e.Id == id);

        private bool ValidateAnswerOptions(ICollection<AnswerOption> options)
        {
            return options.Any(a => a.IsCorrect) && options.Any(a => !a.IsCorrect);
        }
    }
}
