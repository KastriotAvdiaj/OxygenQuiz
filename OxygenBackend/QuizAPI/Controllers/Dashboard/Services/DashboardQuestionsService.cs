using System;
using System.Security.Claims;
using QuizAPI.Controllers.Questions.Services;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Shared;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Dashboard.Services
{
    public class DashboardQuestionsService : IDashboardQuestionsService
    {
        private readonly IQuestionService _questionService;

        public DashboardQuestionsService(IQuestionService questionService)
        {
            _questionService = questionService;
        }

        public async Task<DashboardPaginatedResponse<QuestionBaseDTO>> GetQuestionsAsync(
            ClaimsPrincipal user,
            QuestionFilterParams filterParams)
        {
            var context = ResolveUserContext(user);
            var effectiveFilters = CreateQuestionFilters(filterParams, context.UserId);
            var paged = await _questionService.GetPaginatedQuestionsAsync(effectiveFilters);
            return DashboardPaginatedResponse<QuestionBaseDTO>.FromPagedList(paged, context.Mode);
        }

        public async Task<DashboardPaginatedResponse<MultipleChoiceQuestionDTO>> GetMultipleChoiceQuestionsAsync(
            ClaimsPrincipal user,
            QuestionFilterParams filterParams)
        {
            var context = ResolveUserContext(user);
            var effectiveFilters = CreateQuestionFilters(filterParams, context.UserId);
            var paged = await _questionService.GetPaginatedMultipleChoiceQuestionsAsync(effectiveFilters);
            return DashboardPaginatedResponse<MultipleChoiceQuestionDTO>.FromPagedList(paged, context.Mode);
        }

        public async Task<DashboardPaginatedResponse<TrueFalseQuestionDTO>> GetTrueFalseQuestionsAsync(
            ClaimsPrincipal user,
            QuestionFilterParams filterParams)
        {
            var context = ResolveUserContext(user);
            var effectiveFilters = CreateQuestionFilters(filterParams, context.UserId);
            var paged = await _questionService.GetPaginatedTrueFalseQuestionsAsync(effectiveFilters);
            return DashboardPaginatedResponse<TrueFalseQuestionDTO>.FromPagedList(paged, context.Mode);
        }

        public async Task<DashboardPaginatedResponse<TypeTheAnswerQuestionDTO>> GetTypeTheAnswerQuestionsAsync(
            ClaimsPrincipal user,
            QuestionFilterParams filterParams)
        {
            var context = ResolveUserContext(user);
            var effectiveFilters = CreateQuestionFilters(filterParams, context.UserId);
            var paged = await _questionService.GetPaginatedTypeTheAnswerQuestionsAsync(effectiveFilters);
            return DashboardPaginatedResponse<TypeTheAnswerQuestionDTO>.FromPagedList(paged, context.Mode);
        }

        private static QuestionFilterParams CreateQuestionFilters(QuestionFilterParams source, Guid? userId)
        {
            var filters = CloneQuestionFilters(source);

            if (userId.HasValue)
            {
                filters.UserId = userId;
            }

            return filters;
        }

        private static QuestionFilterParams CloneQuestionFilters(QuestionFilterParams source)
        {
            source ??= new QuestionFilterParams();

            return new QuestionFilterParams
            {
                PageNumber = source.PageNumber,
                PageSize = source.PageSize,
                SearchTerm = source.SearchTerm,
                CategoryId = source.CategoryId,
                DifficultyId = source.DifficultyId,
                LanguageId = source.LanguageId,
                Visibility = source.Visibility,
                Type = source.Type,
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
