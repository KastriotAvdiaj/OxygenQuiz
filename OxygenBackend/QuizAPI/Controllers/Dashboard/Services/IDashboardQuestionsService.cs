using System.Security.Claims;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Shared;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Dashboard.Services
{
    public interface IDashboardQuestionsService
    {
        Task<DashboardPaginatedResponse<QuestionBaseDTO>> GetQuestionsAsync(
            ClaimsPrincipal user,
            QuestionFilterParams filterParams);

        Task<DashboardPaginatedResponse<MultipleChoiceQuestionDTO>> GetMultipleChoiceQuestionsAsync(
            ClaimsPrincipal user,
            QuestionFilterParams filterParams);

        Task<DashboardPaginatedResponse<TrueFalseQuestionDTO>> GetTrueFalseQuestionsAsync(
            ClaimsPrincipal user,
            QuestionFilterParams filterParams);

        Task<DashboardPaginatedResponse<TypeTheAnswerQuestionDTO>> GetTypeTheAnswerQuestionsAsync(
            ClaimsPrincipal user,
            QuestionFilterParams filterParams);
    }
}
