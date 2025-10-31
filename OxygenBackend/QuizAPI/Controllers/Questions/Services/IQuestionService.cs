using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Shared;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Questions.Services
{
    public interface IQuestionService
    {
        // Get methods
        Task<List<QuestionBaseDTO>> GetAllQuestionsAsync(string visibility = null);

        Task<PagedList<QuestionBaseDTO>> GetPaginatedQuestionsAsync(QuestionFilterParams filterParams);
        Task<QuestionBaseDTO> GetQuestionByIdAsync(int id);
        Task<List<QuestionBaseDTO>> GetQuestionsByCategoryAsync(int categoryId);
        Task<List<QuestionBaseDTO>> GetQuestionsByDifficultyAsync(int difficultyId);
        Task<List<QuestionBaseDTO>> GetQuestionsByUserAsync(Guid userId);

        // Type-specific get methods
        Task<PagedList<MultipleChoiceQuestionDTO>> GetPaginatedMultipleChoiceQuestionsAsync(QuestionFilterParams filterParams);
        Task<PagedList<TrueFalseQuestionDTO>> GetPaginatedTrueFalseQuestionsAsync(QuestionFilterParams filterParams);
        Task<PagedList<TypeTheAnswerQuestionDTO>> GetPaginatedTypeTheAnswerQuestionsAsync(QuestionFilterParams filterParams);


        // Create methods
        Task<MultipleChoiceQuestionDTO> CreateMultipleChoiceQuestionAsync(MultipleChoiceQuestionCM questionCM, Guid userId);
        Task<TrueFalseQuestionDTO> CreateTrueFalseQuestionAsync(TrueFalseQuestionCM questionCM, Guid userId);
        Task<TypeTheAnswerQuestionDTO> CreateTypeTheAnswerQuestionAsync(TypeTheAnswerQuestionCM questionCM, Guid userId);

        // Update methods
        Task<MultipleChoiceQuestionDTO> UpdateMultipleChoiceQuestionAsync(MultipleChoiceQuestionUM questionUM, Guid userId);
        Task<TrueFalseQuestionDTO> UpdateTrueFalseQuestionAsync(TrueFalseQuestionUM questionUM, Guid userId);
        Task<TypeTheAnswerQuestionDTO> UpdateTypeTheAnswerQuestionAsync(TypeTheAnswerQuestionUM questionUM, Guid userId);

        // Delete method
        Task<(bool Success, string? ErrorMessage, bool IsCustomMessage)> DeleteQuestionAsync(int id, Guid userId);
    }
}
