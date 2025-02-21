
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes
{
    [Route("api/[controller]")]
    [ApiController]
    public class QuizsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public QuizsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Quizs
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Quiz>>> GetQuizzes()
        {
            if (_context.Quizzes == null)
            {
                return NotFound();
            }
            return await _context.Quizzes.ToListAsync();
        }

        // GET: api/Quizs/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Quiz>> GetQuiz(int id)
        {
            if (_context.Quizzes == null)
            {
                return NotFound();
            }
            var quiz = await _context.Quizzes.FindAsync(id);

            if (quiz == null)
            {
                return NotFound();
            }

            return quiz;
        }

        // PUT: api/Quizs/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateQuiz(int id, [FromBody] QuizCM quizCM)
        {
            var quiz = await _context.Quizzes
                .Include(q => q.QuizQuestions)
                    .ThenInclude(qq => qq.Question)
                        .ThenInclude(q => q.AnswerOptions)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quiz == null)
                return NotFound();

            // Update core quiz properties.
            quiz.Title = quizCM.Title;
            quiz.Description = quizCM.Description;
            /*quiz.Slug = quizCM.Slug;*/
            quiz.CategoryId = quizCM.CategoryId;
            quiz.LanguageId = quizCM.LanguageId;
            quiz.TimeLimit = quizCM.TimeLimit;
            quiz.ShuffleQuestions = quizCM.ShuffleQuestions;
            quiz.ShuffleAnswers = quizCM.ShuffleAnswers;
            quiz.IsPublished = quizCM.IsPublished;
            quiz.PassingScore = quizCM.PassingScore;
            /*quiz.UpdatedAt = DateTime.UtcNow;*/

            // Remove existing quiz-question links.
            _context.QuizQuestions.RemoveRange(quiz.QuizQuestions);

            // Process updated quiz questions.
            foreach (var q in quizCM.Questions)
            {
                Question question = null;
                if (q.ExistingQuestionId.HasValue)
                {
                    question = await _context.Questions.FindAsync(q.ExistingQuestionId.Value);
                    if (question == null)
                        return BadRequest($"Question with id {q.ExistingQuestionId.Value} does not exist.");
                }
                else if (q.NewQuestion != null)
                {
                    question = new Question
                    {
                        Text = q.NewQuestion.Text,
                        DifficultyId = q.NewQuestion.DifficultyId,
                        CategoryId = q.NewQuestion.CategoryId,
                        LanguageId = q.NewQuestion.LanguageId,
                        CreatedAt = DateTime.UtcNow,
                        UserId = quiz.UserId,
                        Visibility = QuestionVisibility.Private,
                        AnswerOptions = q.NewQuestion.AnswerOptions.Select(ao => new AnswerOption
                        {
                            Text = ao.Text,
                            IsCorrect = ao.IsCorrect
                        }).ToList()
                    };
                    _context.Questions.Add(question);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    return BadRequest("Each question must have either an ExistingQuestionId or a NewQuestion payload.");
                }

                var quizQuestion = new QuizQuestion
                {
                    Quiz = quiz,
                    Question = question,
                };

                quiz.QuizQuestions.Add(quizQuestion);
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // POST: api/Quizs
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<QuizDTO>> CreateQuiz([FromBody] QuizCM quizCM)
        {
            // Replace with your actual current user retrieval logic.
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == "admin");

            var quiz = new Quiz
            {
                Title = quizCM.Title,
                Description = quizCM.Description,
                /*Slug = quizCM.Slug,*/
                CategoryId = quizCM.CategoryId,
                LanguageId = quizCM.LanguageId,
                TimeLimit = quizCM.TimeLimit,
                ShuffleQuestions = quizCM.ShuffleQuestions,
                ShuffleAnswers = quizCM.ShuffleAnswers,
                IsPublished = quizCM.IsPublished,
                PassingScore = quizCM.PassingScore,
                CreatedAt = DateTime.UtcNow,
                UserId = user.Id,
            };

            // Process each quiz question.
            foreach (var q in quizCM.Questions)
            {
                Question question = null;

                if (q.ExistingQuestionId.HasValue)
                {
                    // Use an existing global question.
                    question = await _context.Questions.FindAsync(q.ExistingQuestionId.Value);
                    if (question == null)
                        return BadRequest($"Question with id {q.ExistingQuestionId.Value} does not exist.");
                }
                else if (q.NewQuestion != null)
                {
                    // Create a new custom (private) question.
                    question = new Question
                    {
                        Text = q.NewQuestion.Text,
                        DifficultyId = q.NewQuestion.DifficultyId,
                        CategoryId = q.NewQuestion.CategoryId,
                        LanguageId = q.NewQuestion.LanguageId,
                        CreatedAt = DateTime.UtcNow,
                        UserId = user.Id,
                        Visibility = QuestionVisibility.Private,
                        AnswerOptions = q.NewQuestion.AnswerOptions.Select(ao => new AnswerOption
                        {
                            Text = ao.Text,
                            IsCorrect = ao.IsCorrect
                        }).ToList()
                    };
                    _context.Questions.Add(question);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    return BadRequest("Each question must have either an ExistingQuestionId or a NewQuestion payload.");
                }

                // Create the join entity linking the quiz and the question.
                var quizQuestion = new QuizQuestion
                {
                    Quiz = quiz,
                    Question = question,
                };

                quiz.QuizQuestions.Add(quizQuestion);
            }

            _context.Quizzes.Add(quiz);
            await _context.SaveChangesAsync();

            var quizDTO = MapToQuizDTO(quiz);
            return CreatedAtAction(nameof(GetQuiz), new { id = quizDTO.Id }, quizDTO);
        }

        // DELETE: api/Quizs/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteQuiz(int id)
        {
            if (_context.Quizzes == null)
            {
                return NotFound();
            }
            var quiz = await _context.Quizzes.FindAsync(id);
            if (quiz == null)
            {
                return NotFound();
            }

            _context.Quizzes.Remove(quiz);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool QuizExists(int id)
        {
            return (_context.Quizzes?.Any(e => e.Id == id)).GetValueOrDefault();
        }

        private static QuizDTO MapToQuizDTO(Quiz quiz)
        {
            return new QuizDTO
            {
                Id = quiz.Id,
                Title = quiz.Title,
                Description = quiz.Description,
                /*Slug = quiz.Slug,*/
                CategoryId = quiz.CategoryId,
                LanguageId = quiz.LanguageId,
                TimeLimit = quiz.TimeLimit,
                ShuffleQuestions = quiz.ShuffleQuestions,
                ShuffleAnswers = quiz.ShuffleAnswers,
                IsPublished = quiz.IsPublished,
                PassingScore = quiz.PassingScore,
                CreatedAt = quiz.CreatedAt,
               /* UpdatedAt = quiz.UpdatedAt,*/
                Questions = quiz.QuizQuestions.Select(qq => new QuizQuestionDTO
                {
                    QuizQuestionId = qq.Id,
                    QuestionId = qq.Question.Id,
                    Question = new QuestionDTO
                    {
                        Id = qq.Question.Id,
                        Text = qq.Question.Text,
                        AnswerOptions = qq.Question.AnswerOptions.Select(ao => new AnswerOptionDTO
                        {
                            Id = ao.Id,
                            Text = ao.Text,
                            IsCorrect = ao.IsCorrect
                        }).ToList()
                    }
                }).ToList()
            };
        }
    }
}
