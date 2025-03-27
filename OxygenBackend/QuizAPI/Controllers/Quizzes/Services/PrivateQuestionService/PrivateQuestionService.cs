using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Quiz;
using QuizAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace QuizAPI.Controllers.Quizzes.Services.PrivateQuestionService
{
    public class PrivateQuestionService : IPrivateQuestionService
    {
        private readonly ApplicationDbContext _context;

        public PrivateQuestionService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<PrivateQuestionDto> CreatePrivateQuestionAsync(PrivateQuestionCM model, Guid userId)
        {
            var question = new PrivateQuestion
            {
                Text = model.Text,
                CreatedAt = DateTime.UtcNow,
                UserId = userId,
                DifficultyId = model.DifficultyId,
                CategoryId = model.CategoryId,
                AnswerOptions = model.AnswerOptions?
                    .Select(a => new AnswerOption
                    {
                        Text = a.Text,
                        IsCorrect = a.IsCorrect
                    })
                    .ToList() ?? new List<AnswerOption>()
            };

            _context.PrivateQuestions.Add(question);
            await _context.SaveChangesAsync();

            return new PrivateQuestionDto
            {
                Id = question.Id,
                Text = question.Text,
                CreatedAt = question.CreatedAt,
                DifficultyId = question.DifficultyId,
                CategoryId = question.CategoryId,
                AnswerOptions = question.AnswerOptions.Select(a => new AnswerOptionDTO
                {
                    ID = a.Id,
                    Text = a.Text,
                    IsCorrect = a.IsCorrect
                }).ToList()
            };
        }

        public async Task<PrivateQuestionDto> GetPrivateQuestionByIdAsync(int id, Guid userId)
        {
            var question = await _context.PrivateQuestions
                .Include(q => q.AnswerOptions)
                .FirstOrDefaultAsync(q => q.Id == id && q.UserId == userId);
            if (question == null)
                return null;

            return new PrivateQuestionDto
            {
                Id = question.Id,
                Text = question.Text,
                CreatedAt = question.CreatedAt,
                DifficultyId = question.DifficultyId,
                CategoryId = question.CategoryId,
                AnswerOptions = question.AnswerOptions.Select(a => new AnswerOptionDTO
                {
                    ID = a.Id,
                    Text = a.Text,
                    IsCorrect = a.IsCorrect
                }).ToList()
            };
        }

        public async Task<IEnumerable<PrivateQuestionDto>> GetPrivateQuestionsByUserAsync(Guid userId)
        {
            var questions = await _context.PrivateQuestions
                .Include(q => q.AnswerOptions)
                .Where(q => q.UserId == userId)
                .ToListAsync();

            return questions.Select(question => new PrivateQuestionDto
            {
                Id = question.Id,
                Text = question.Text,
                CreatedAt = question.CreatedAt,
                DifficultyId = question.DifficultyId,
                CategoryId = question.CategoryId,
                AnswerOptions = question.AnswerOptions.Select(a => new AnswerOptionDTO
                {
                    ID = a.Id,
                    Text = a.Text,
                    IsCorrect = a.IsCorrect
                }).ToList()
            });
        }

        public async Task<bool> UpdatePrivateQuestionAsync(int id, PrivateQuestionCM model, Guid userId)
        {
            var question = await _context.PrivateQuestions
                .Include(q => q.AnswerOptions)
                .FirstOrDefaultAsync(q => q.Id == id && q.UserId == userId);
            if (question == null)
                return false;

            // Update main properties
            question.Text = model.Text;
            question.DifficultyId = model.DifficultyId;
            question.CategoryId = model.CategoryId;

            // Update AnswerOptions:
            // For simplicity, remove existing answer options and add new ones.
            _context.AnswerOptions.RemoveRange(question.AnswerOptions);
            question.AnswerOptions = model.AnswerOptions?
                .Select(a => new AnswerOption
                {
                    Text = a.Text,
                    IsCorrect = a.IsCorrect
                })
                .ToList() ?? new List<AnswerOption>();

            _context.PrivateQuestions.Update(question);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeletePrivateQuestionAsync(int id, Guid userId)
        {
            var question = await _context.PrivateQuestions
                .FirstOrDefaultAsync(q => q.Id == id && q.UserId == userId);
            if (question == null)
                return false;

            _context.PrivateQuestions.Remove(question);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
