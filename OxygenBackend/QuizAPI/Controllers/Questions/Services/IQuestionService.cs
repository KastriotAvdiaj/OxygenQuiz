using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Shared;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Questions.Services
{
    public interface IQuestionService
    {
        // Get methods
        Task<List<QuestionBaseDTO>> GetAllQuestionsAsync(string visibility = null);
        Task<QuestionBaseDTO> GetQuestionByIdAsync(int id);
        Task<List<QuestionBaseDTO>> GetQuestionsByCategoryAsync(int categoryId);
        Task<List<QuestionBaseDTO>> GetQuestionsByDifficultyAsync(int difficultyId);
        Task<List<QuestionBaseDTO>> GetQuestionsByUserAsync(Guid userId);

        // Type-specific get methods
        Task<List<MultipleChoiceQuestionDTO>> GetMultipleChoiceQuestionsAsync();
        Task<List<TrueFalseQuestionDTO>> GetTrueFalseQuestionsAsync();
        Task<List<TypeAnswerQuestionDTO>> GetTypeAnswerQuestionsAsync();

        // Create methods
        Task<MultipleChoiceQuestionDTO> CreateMultipleChoiceQuestionAsync(MultipleChoiceQuestionCM questionCM, Guid userId);
        Task<TrueFalseQuestionDTO> CreateTrueFalseQuestionAsync(TrueFalseQuestionCM questionCM, Guid userId);
        Task<TypeAnswerQuestionDTO> CreateTypeAnswerQuestionAsync(TypeAnswerQuestionCM questionCM, Guid userId);

        // Update methods
        Task<MultipleChoiceQuestionDTO> UpdateMultipleChoiceQuestionAsync(MultipleChoiceQuestionUM questionUM, Guid userId);
        Task<TrueFalseQuestionDTO> UpdateTrueFalseQuestionAsync(TrueFalseQuestionUM questionUM, Guid userId);
        Task<TypeAnswerQuestionDTO> UpdateTypeAnswerQuestionAsync(TypeAnswerQuestionUM questionUM, Guid userId);

        // Delete method
        Task<bool> DeleteQuestionAsync(int id, Guid userId);
    }
}
