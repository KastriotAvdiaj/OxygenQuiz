using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Shared;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Questions.Services
{
    public interface IQuestionService
    {

        Task<Question> CreateQuestionAsync(
            QuestionCM newQuestionCM,
            string userId,
            QuestionVisibility visibility);

        Task<(bool Success, string Message)> DeleteQuestionAsync(int id);

        Task<IndividualQuestionDTO> GetQuestionAsync(int id);

        Task<Question> UpdateQuestionAsync(int id, QuestionUM questionUM);

        QuestionDTO MapToQuestionDTO (Question questionDTO);

        Task<PaginatedResponse<QuestionDTO>> GetPaginatedQuestionsAsync(int page,
       int pageSize,
       string? searchTerm,
       string? category);

    }
}
