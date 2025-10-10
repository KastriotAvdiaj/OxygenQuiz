using QuizAPI.DTOs.Question;

namespace QuizAPI.Controllers.Questions.TestQuestions.Services
{
    public interface ITestQuestionService
    {
        Task<TestQuestionResponse> TestQuestionAsync(TestQuestionRequest request);
    }
}
