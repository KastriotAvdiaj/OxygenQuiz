using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs;
using QuizAPI.Models;

namespace QuizAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuestionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public QuestionsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Questions
        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuestionDTO>>> GetQuestions()
        {
            var questionDTOs = await _context.Questions
                .Select(q => new QuestionDTO
                {
                    ID = q.Id,
                    Text = q.Text,
                    Difficulty = q.Difficulty,
                    AnswerOptions = q.AnswerOptions.Select(ao => new AnswerOptionDTO
                    {
                        ID = ao.Id,
                        Text = ao.Text,
                        IsCorrect = ao.IsCorrect
                    }).ToList()
                })
                .ToListAsync();

            return Ok(questionDTOs);
        }



        // GET: api/Questions/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Question>> GetQuestion(int id)
        {
            var question = await _context.Questions.Include(q => q.AnswerOptions)
                                                   .FirstOrDefaultAsync(q => q.Id == id);

            if (question == null)
                return NotFound();

            return question;
        }

        // POST: api/Questions
        [HttpPost]
        public async Task<ActionResult<Question>> CreateQuestionWithDto(QuestionCM questionDto)
        {
            // Validate the DTO
            if (questionDto == null)
                return BadRequest("Question data is required.");
            
            if (string.IsNullOrWhiteSpace(questionDto.Text))
                return BadRequest("Question text is required.");

            if (questionDto.AnswerOptions == null || !questionDto.AnswerOptions.Any())
                return BadRequest("At least two answer options are required.");

            if (!ValidateAnswerOptions(questionDto.AnswerOptions))
                return BadRequest("Each question must have at least one correct and one incorrect answer.");

            // Map DTO to Entity
            var question = new Question
            {
                Text = questionDto.Text,
                Difficulty = questionDto.Difficulty,
                AnswerOptions = new List<AnswerOption>() 
            };

            // Create and add each answer option
            foreach (var optionDto in questionDto.AnswerOptions)
            {
                var answerOption = new AnswerOption
                {
                    Text = optionDto.Text,
                    IsCorrect = optionDto.IsCorrect,
                    Question = question 
                };
                question.AnswerOptions.Add(answerOption);
            }

            _context.Questions.Add(question);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetQuestion), new { id = question.Id }, question);
        }

        // Uses AnswerOptionDTO
        private static bool ValidateAnswerOptions(ICollection<AnswerOptionCM> options)
        {
            return options.Any(a => a.IsCorrect) && options.Any(a => !a.IsCorrect);
        }


        // PUT: api/Questions/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateQuestion(int id, QuestionCM questionDto)
        {
            var question = await _context.Questions.Include(q => q.AnswerOptions)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (question == null)
                return NotFound();

            if (questionDto.AnswerOptions == null || !ValidateAnswerOptions(questionDto.AnswerOptions))
                return BadRequest("Each question must have at least one correct and one incorrect answer.");

            // Update the question properties
            question.Text = questionDto.Text;
            question.Difficulty = questionDto.Difficulty;
            
            // Clear existing options and add new ones
            _context.AnswerOptions.RemoveRange(question.AnswerOptions);
            question.AnswerOptions = questionDto.AnswerOptions.Select(ao => new AnswerOption
            {
                Text = ao.Text,
                IsCorrect = ao.IsCorrect,
                QuestionId = id
            }).ToList();

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!QuestionExists(id))
                    return NotFound();
                else
                    throw;
            }

            return NoContent();
        }

        // DELETE: api/Questions/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteQuestion(int id)
        {
            var question = await _context.Questions.FindAsync(id);
            if (question == null)
                return NotFound();

            _context.Questions.Remove(question);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool QuestionExists(int id) => _context.Questions.Any(e => e.Id == id);

        // Uses AnswerOption
        private static bool ValidateAnswerOptions(ICollection<AnswerOption> options)
        {
            return options.Any(a => a.IsCorrect) && options.Any(a => !a.IsCorrect);
        }
    }
}
