using System;
using System.Security.Claims;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.DTOs.Quiz;
using QuizAPI.DTOs.Shared;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Dashboard.Services
{
    public class DashboardQuizService : IDashboardQuizService
    {
        private readonly IQuizService _quizService;

        public DashboardQuizService(IQuizService quizService)
        {
            _quizService = quizService;
        }

        public async Task<DashboardPaginatedResponse<QuizSummaryDTO>> GetQuizzesAsync(
            ClaimsPrincipal user,
            QuizFilterParams filterParams)
        {
            var context = ResolveUserContext(user);
            var effectiveFilters = CloneQuizFilters(filterParams);

            if (context.UserId.HasValue)
            {
                effectiveFilters.UserId = context.UserId;
                var paged = await _quizService.GetQuizzesByUserAsync(context.UserId.Value, effectiveFilters);
                return DashboardPaginatedResponse<QuizSummaryDTO>.FromPagedList(paged, context.Mode);
            }
            else
            {
                var paged = await _quizService.GetAllQuizzesAsync(effectiveFilters);
                return DashboardPaginatedResponse<QuizSummaryDTO>.FromPagedList(paged, context.Mode);
            }
        }

        private static QuizFilterParams CloneQuizFilters(QuizFilterParams source)
        {
            source ??= new QuizFilterParams();

            return new QuizFilterParams
            {
                PageNumber = source.PageNumber,
                PageSize = source.PageSize,
                SearchTerm = source.SearchTerm,
                CategoryId = source.CategoryId,
                DifficultyId = source.DifficultyId,
                LanguageId = source.LanguageId,
                Visibility = source.Visibility,
                IsPublished = source.IsPublished,
                IsActive = source.IsActive,
                UserId = source.UserId
            };
        }

        private static DashboardUserContext ResolveUserContext(ClaimsPrincipal user)
        {
            if (user == null)
            {
                throw new ArgumentNullException(nameof(user));
            }

            if (user.IsInRole("Admin") || user.IsInRole("SuperAdmin"))
            {
                return DashboardUserContext.Admin();
            }

            var userIdValue = user.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdValue, out var userId))
            {
                throw new UnauthorizedAccessException("User identifier is missing or invalid.");
            }

            return DashboardUserContext.ForUser(userId);
        }

        private record DashboardUserContext(Guid? UserId, string Mode)
        {
            public static DashboardUserContext Admin() => new DashboardUserContext(null, DashboardViewModes.Admin);

            public static DashboardUserContext ForUser(Guid userId) => new DashboardUserContext(userId, DashboardViewModes.My);
        }
    }
}
