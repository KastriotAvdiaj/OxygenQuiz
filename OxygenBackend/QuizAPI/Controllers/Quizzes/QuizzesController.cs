
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Controllers.Questions.Services;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Quiz;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using System.Security.Claims;

namespace QuizAPI.Controllers.Quizzes
{
    [Route("api/[controller]")]
    [ApiController]
    public class QuizzesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IQuestionService _questionService;
        private readonly IQuizService _quizService;

        public QuizzesController(ApplicationDbContext context, IQuestionService questionService, IQuizService quizService)
        {
            _context = context;
            _questionService = questionService;
            _quizService= quizService;

        }

        // GET: api/Quizs
        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuizDTO>>> GetQuizzes()
        {
            if (_context.Quizzes == null)
            {
                return NotFound();
            }
            return await _quizService.GetQuizzesAsync();
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetQuiz(int id)
        {
            var quizDto = await _quizService.GetQuizAsync(id);
            if (quizDto == null)
            {
                return NotFound();
            }
            return Ok(quizDto);
        }

        [HttpGet("{id}/questions")]
        public async Task<IActionResult> GetQuizQuestions(int id)
            {
            var quizQuestions = await _quizService.GetQuizQuestionsAsync(id);
            return Ok(quizQuestions);
        }

        // PUT: api/Quizs/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        /* [HttpPut("{id}")]
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
             *//*quiz.Slug = quizCM.Slug;*//*
             quiz.CategoryId = quizCM.CategoryId;
             quiz.LanguageId = quizCM.LanguageId;
             quiz.TimeLimit = quizCM.TimeLimit;
             quiz.ShuffleQuestions = quizCM.ShuffleQuestions;
             quiz.ShuffleAnswers = quizCM.ShuffleAnswers;
             quiz.IsPublished = quizCM.IsPublished;
             quiz.PassingScore = quizCM.PassingScore;

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
         }*/

        // POST: api/Quizs
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<QuizDTO>> CreateQuiz([FromBody] QuizCM quizCM)
        {

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User ID not found in token");

            try
            {
           
                var quiz = await _quizService.CreateQuizAsync(quizCM, userId);
                var quizDto = await _quizService.MapToQuizDTO(quiz);

                return Ok(quizDto);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }

        }

        // DELETE: api/Quizs/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteQuiz(int id)
        {
            if (_context.Quizzes == null)
            {
                return NotFound();
            }
            var quiz = await _context.Quizzes
                 .Include(q => q.QuizQuestions)
                    .FirstOrDefaultAsync(q => q.Id == id);

            if (quiz == null)
            {
                return NotFound();
            }

            _context.QuizQuestions.RemoveRange(quiz.QuizQuestions);
            _context.Quizzes.Remove(quiz);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool QuizExists(int id)
        {
            return (_context.Quizzes?.Any(e => e.Id == id)).GetValueOrDefault();
        }

    }
}
