using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Quiz;
using QuizAPI.DTOs.Shared;
using QuizAPI.DTOs.User;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Questions.Services
{
    public class QuestionService : IQuestionService
    {
        private readonly ApplicationDbContext _context;

        public QuestionService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Question> CreateQuestionAsync(
            QuestionCM newQuestionCM,
            string userId,
            QuestionVisibility visibility
            )
        {
            // Create the new question entity.
            var question = new Question
            {
                Text = newQuestionCM.Text,
                DifficultyId = newQuestionCM.DifficultyId,
                LanguageId = newQuestionCM.LanguageId,
                CreatedAt = DateTime.UtcNow,
                CategoryId = newQuestionCM.CategoryId,
                UserId = Guid.Parse(userId),
                Visibility = visibility,
            };

            foreach (var optionDto in newQuestionCM.AnswerOptions)
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

            return question;
        }

        public async Task<Question> UpdateQuestionAsync(
    int questionId,
    QuestionUM updatedQuestionCM)
        {
            
            var question = await _context.Questions
                .Include(q => q.AnswerOptions)
                .FirstOrDefaultAsync(q => q.Id == questionId);

            if (question == null)
            {
                throw new Exception("Question not found.");
            }

            question.Text = updatedQuestionCM.Text;
            question.DifficultyId = updatedQuestionCM.DifficultyId;
            question.LanguageId = updatedQuestionCM.LanguageId;
            question.CategoryId = updatedQuestionCM.CategoryId;
            question.Visibility = updatedQuestionCM.Visibility;

                
            _context.AnswerOptions.RemoveRange(question.AnswerOptions);
            question.AnswerOptions.Clear();

            foreach (var optionDto in updatedQuestionCM.AnswerOptions)
            {
                var answerOption = new AnswerOption
                {
                    Text = optionDto.Text,
                    IsCorrect = optionDto.IsCorrect,
                    Question = question
                };
                question.AnswerOptions.Add(answerOption);
            }

            await _context.SaveChangesAsync();

            return question;
        }

        public async Task<(bool Success, string Message)> DeleteQuestionAsync(int id)
        {
            var question = await _context.Questions
                .Include(q => q.QuizQuestions) // Ensure related quiz data is loaded
                .FirstOrDefaultAsync(q => q.Id == id);

            if (question == null)
            {
                return (false, "Question not found.");
            }

            // Check if the question is linked to any quiz
            if (question.QuizQuestions.Any())
            {
                return (false, "Question is currently part of an active quiz and cannot be deleted.");
            }

            _context.Questions.Remove(question);
            await _context.SaveChangesAsync();

            return (true, "Question deleted successfully.");
        }

        public async Task<IndividualQuestionDTO> GetQuestionAsync(int id)
        {
            var question = await _context.Questions
       .Include(q => q.User)
       .Include(q => q.Difficulty)
       .Include(q => q.Category)
       .Include(q => q.Language)
       .Include(q => q.AnswerOptions)
       .FirstOrDefaultAsync(q => q.Id == id);

            if (question == null) return null;

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
                Visibility = question.Visibility.ToString(),
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

            return questionDto;
        }

        public async Task<PaginatedResponse<QuestionDTO>> GetPaginatedQuestionsAsync(
       int page,
       int pageSize,
       string? searchTerm,
       string? category)
        {
            var query = _context.Questions.AsQueryable();

            if (!string.IsNullOrEmpty(searchTerm) && searchTerm != "undefined")
            {
                query = query.Where(q => q.Text.Contains(searchTerm));
            }

            if (!string.IsNullOrEmpty(category) && category != "null" && category != "all")
            {
                if (int.TryParse(category, out int categoryId))
                {
                    query = query.Where(q => q.CategoryId == categoryId);
                }
            }

            var totalQuestions = await query.CountAsync();

            var questionDTOs = await query
                .OrderBy(q => q.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(q => new QuestionDTO
                {
                    ID = q.Id,
                    Text = q.Text,
                    Difficulty = q.Difficulty.Level,
                    Category = q.Category.Name,
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

            return new PaginatedResponse<QuestionDTO>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalQuestions,
                TotalPages = (int)Math.Ceiling(totalQuestions / (double)pageSize),
                Items = questionDTOs
            };
        }
    }
}
