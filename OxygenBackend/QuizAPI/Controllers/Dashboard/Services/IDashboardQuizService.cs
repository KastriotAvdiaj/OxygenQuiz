using System.Security.Claims;
using QuizAPI.DTOs.Quiz;
using QuizAPI.DTOs.Shared;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Dashboard.Services
{
    public interface IDashboardQuizService
    {
        Task<DashboardPaginatedResponse<QuizSummaryDTO>> GetQuizzesAsync(
            ClaimsPrincipal user,
            QuizFilterParams filterParams);
    }
}
