using QuizAPI.DTOs.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.PrivateQuestionService
{
    public interface IPrivateQuestionService
    {
        Task<PrivateQuestionDto> CreatePrivateQuestionAsync(PrivateQuestionCM model, Guid userId);
        Task<PrivateQuestionDto> GetPrivateQuestionByIdAsync(int id, Guid userId);
        Task<IEnumerable<PrivateQuestionDto>> GetPrivateQuestionsByUserAsync(Guid userId);
        Task<bool> UpdatePrivateQuestionAsync(int id, PrivateQuestionCM model, Guid userId);
        Task<bool> DeletePrivateQuestionAsync(int id, Guid userId);
    }
}
