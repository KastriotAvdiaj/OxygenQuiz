using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Shared;
using QuizAPI.DTOs.User;
using QuizAPI.Helpers;
using QuizAPI.Models;
using QuizAPI.DTOs.User;
using QuizAPI.Services;
using System.Security.Claims;

namespace QuizAPI.Controllers.Questions
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuestionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly DashboardService _dashboardService;

        public QuestionsController(ApplicationDbContext context, DashboardService dashboardService)
        {
            _context = context;
            _dashboardService = dashboardService;
        }


        // GET: api/Questions
        [HttpGet]
        public async Task<ActionResult<PaginatedResponse<QuestionDTO>>> GetQuestions(
int page = 1,
int pageSize = 20,
string? searchTerm = null,
string? category = null)
        {
            if (page <= 0 || pageSize <= 0)
                return BadRequest("Page and page size must be positive numbers.");

            // Base query
            var query = _context.Questions.AsQueryable();

            // Apply search filter if searchTerm is provided
            if (!string.IsNullOrEmpty(searchTerm) && searchTerm != "undefined")
            {
                query = query.Where(q => q.Text.Contains(searchTerm));
            }

            // Apply category filter if category is provided
            if (!string.IsNullOrEmpty(category) && category != "null" && category != "all")
            {
                query = query.Where(q => q.Category.Name == category);
            }

            // Calculate total count of filtered questions
            var totalQuestions = await query.CountAsync();

            // Fetch paginated questions
            var questionDTOs = await query
                .OrderBy(q => q.CreatedAt) // Ensure consistent ordering (optional)
                .Skip((page - 1) * pageSize) // Skip records for previous pages
                .Take(pageSize)             // Take only the current page's data
                .Select(q => new QuestionDTO
                {
                    ID = q.Id,
                    Text = q.Text,
                    Difficulty = q.Difficulty.Level,
                    Category = q.Category.Name,
                    TotalQuestions = totalQuestions,
                    User = new UserBasicDTO
                    {
                        Id = q.User.Id,
                        Username = q.User.Username,
                        ProfileImageUrl = q.User.ProfileImageUrl
                    },
                    AnswerOptions = q.AnswerOptions.Select(ao => new AnswerOptionDTO
                    {
                        ID = ao.Id,
                        Text = ao.Text,
                        IsCorrect = ao.IsCorrect
                    }).ToList()
                })
                .ToListAsync();

            // Return paginated response
            return Ok(new PaginatedResponse<QuestionDTO>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalQuestions,
                TotalPages = (int)Math.Ceiling(totalQuestions / (double)pageSize),
                Items = questionDTOs
            });
        }



        // GET: api/Questions/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<IndividualQuestionDTO>> GetQuestion(int id)
        {

            var question = await _context.Questions
       .Include(q => q.User)  
       .Include(q => q.Difficulty)
       .Include(q => q.Category)
       .Include(q => q.Language)
       .Include(q => q.AnswerOptions)
       .FirstOrDefaultAsync(q => q.Id == id);

            if(question == null)
            {
                return NotFound();

            }

            var questionDto = new IndividualQuestionDTO
            {
                ID = question.Id,
                Text = question.Text,
                DifficultyId = question.DifficultyId,
                Difficulty = question.Difficulty.Level,
                CategoryId = question.CategoryId,
                Category = question.Category.Name,
                Language = question.Language.Language,
                LanguageId = question.LanguageId,
                UserId = question.UserId,
                CreatedAt = question.CreatedAt,
                User = new UserBasicDTO
                {
                    Id = question.User.Id,
                    Username = question.User.Username,
                    ProfileImageUrl = question.User.ProfileImageUrl
                },
                AnswerOptions = question.AnswerOptions
                    .Select(a => new AnswerOptionDTO
                    {
                        ID = a.Id,
                        Text = a.Text,
                        IsCorrect = a.IsCorrect
                    })
                    .ToList()
            };

            return Ok(questionDto);
        }


        // POST: api/Questions
        [Authorize]
        [HttpPost]
        public async Task<ActionResult<Question>> CreateQuestionWithDto(QuestionCM questionDto)
        {

            // Validate the DTO
            if (!QuestionHelpers.ValidateQuestionDto(questionDto))
                return BadRequest("Invalid question data.");

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID not found in token." });
            }
            var category = await _context.QuestionCategories.FirstOrDefaultAsync(c => c.Name == questionDto.Category);
            var difficulty = await _context.QuestionDifficulties.FirstOrDefaultAsync(d => d.Level == questionDto.Difficulty);
            var language = await _context.QuestionLanguages.FirstOrDefaultAsync(l => l.Language == questionDto.Language);

            if (category == null)
            {
                return BadRequest("Category doesn't exist");
            } else if (language == null)
            {
                return BadRequest("Language doesn't exist");
            }else if (difficulty == null) {
                return BadRequest("Difficulty doesn't exist");
            }

            var question = new Question
            {
                Text = questionDto.Text,
                DifficultyId = difficulty.ID,
                LanguageId = language.Id,
                CreatedAt = DateTime.UtcNow,
                CategoryId = category.Id, 
                UserId = Guid.Parse(userId)
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

        // PUT: api/Questions/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateQuestion(int id, QuestionCM questionDto)
        {
            var question = await _context.Questions.Include(q => q.AnswerOptions)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (question == null)
                return NotFound();

            if (questionDto.AnswerOptions == null || !QuestionHelpers.ValidateAnswerOptions(questionDto.AnswerOptions))
                return BadRequest("Each question must have at least one correct and one incorrect answer.");

            // Update the question properties
            question.Text = questionDto.Text;
            /* question.DifficultyId = questionDto.DifficultyLevel;*/

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

        [Authorize(Roles = "Admin , SuperAdmin")]
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

 
    }
}