/*using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.Models;

namespace QuizAPI.Repositories.Question
{
    public class QuestionRepository : IQuestionRepository
    {
        private readonly ApplicationDbContext _context;

        public QuestionRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<QuestionDTO>> GetQuestionsAsync(int page, int pageSize, string? searchTerm, string? category)
        {
            var query = _context.Questions.AsQueryable();

            if (!string.IsNullOrEmpty(searchTerm) && searchTerm != "undefined")
                query = query.Where(q => q.Text.Contains(searchTerm));

            if (!string.IsNullOrEmpty(category) && category != "null" && category != "All categories")
                query = query.Where(q => q.Category.Name == category);

            var totalQuestions = await query.CountAsync();

            return await query
                .OrderBy(q => q.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(q => new QuestionDTO
                {
                    ID = q.Id,
                    Text = q.Text,
                    Difficulty = q.Difficulty,
                    Category = q.Category.Name,
                    TotalQuestions = totalQuestions,
                    AnswerOptions = q.AnswerOptions.Select(ao => new AnswerOptionDTO
                    {
                        ID = ao.Id,
                        Text = ao.Text,
                        IsCorrect = ao.IsCorrect
                    }).ToList()
                })
                .ToListAsync();
        }

        public async Task<Question?> GetQuestionByIdAsync(int id)
        {
            return await _context.Questions.Include(q => q.AnswerOptions).FirstOrDefaultAsync(q => q.Id == id);
        }

        public async Task AddQuestionAsync(Question question)
        {
            _context.Questions.Add(question);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateQuestionAsync(Question question)
        {
            _context.Questions.Update(question);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteQuestionAsync(int id)
        {
            var question = await _context.Questions.FindAsync(id);
            if (question != null)
            {
                _context.Questions.Remove(question);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> QuestionExistsAsync(int id)
        {
            return await _context.Questions.AnyAsync(q => q.Id == id);
        }
    }
}
*/