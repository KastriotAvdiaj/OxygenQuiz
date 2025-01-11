using QuizAPI.DTOs.Question;
using QuizAPI.Models;

namespace QuizAPI.Models;

public interface IQuestionRepository
{
    Task<IEnumerable<QuestionDTO>> GetQuestionsAsync(int page, int pageSize, string? searchTerm, string? category);
    /*Task<Question?> GetQuestionByIdAsync(int id);*/
    Task AddQuestionAsync(Question question);
    Task UpdateQuestionAsync(Question question);
    Task DeleteQuestionAsync(int id);
    Task<bool> QuestionExistsAsync(int id);
}
