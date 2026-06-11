using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Controllers.Image.Services;
using QuizAPI.Controllers.Questions.Services.AnswerOptions;
using QuizAPI.DTOs.Question;
using QuizAPI.Filtering;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Controllers.Questions.Services
{
    /// <summary>
    /// Question business logic: mapping, validation, the shared filtering framework and image
    /// association. All database access is delegated to <see cref="IQuestionRepository"/>, so this
    /// class never touches the DbContext directly. Public surface (IQuestionService) is unchanged.
    /// </summary>
    public class QuestionService : IQuestionService
    {
        private readonly IQuestionRepository _questions;
        private readonly IMapper _mapper;
        private readonly IAnswerOptionService _answerOptionService;
        private readonly IImageService _imageService;

        public QuestionService(
            IQuestionRepository questions,
            IMapper mapper,
            IAnswerOptionService answerOptionService,
            IImageService imageService)
        {
            _questions = questions;
            _mapper = mapper;
            _answerOptionService = answerOptionService;
            _imageService = imageService;
        }

        // ── Reads ─────────────────────────────────────────────────────────────────
        public async Task<List<QuestionBaseDTO>> GetAllQuestionsAsync(string visibility = null)
        {
            var query = _questions.Query();

            if (!string.IsNullOrEmpty(visibility)
                && Enum.TryParse(visibility, true, out QuestionVisibility visibilityEnum))
            {
                query = query.Where(q => q.Visibility == visibilityEnum);
            }

            return _mapper.Map<List<QuestionBaseDTO>>(await query.ToListAsync());
        }

        public async Task<PagedList<QuestionBaseDTO>> GetPaginatedQuestionsAsync(QuestionFilterParams filterParams)
        {
            var query = ApplyFilters(_questions.Query(), filterParams);
            var projected = query.ProjectTo<QuestionBaseDTO>(_mapper.ConfigurationProvider);

            return await PagedList<QuestionBaseDTO>.CreateAsync(
                projected, filterParams.PageNumber, filterParams.PageSize);
        }

        /// <summary>
        /// Reference implementation of the shared filtering framework. Applies the generic
        /// <see cref="FilterQuery"/> (filters + search + sort) against the whitelisted
        /// <see cref="QuestionFilterFields"/>, then projects + pages into the standard
        /// <see cref="PagedResponse{T}"/> body envelope.
        ///
        /// <paramref name="restrictToUserId"/> is a server-derived ownership clamp: when set
        /// (e.g. the "my questions" endpoint) it is applied as a hard Where BEFORE the
        /// client's filters, so a caller can never widen their scope via query params.
        /// </summary>
        public async Task<PagedResponse<QuestionBaseDTO>> SearchQuestionsAsync(
            FilterQuery query, Guid? restrictToUserId = null, CancellationToken ct = default)
        {
            IQueryable<QuestionBase> q = _questions.Query();

            if (restrictToUserId is { } uid)
                q = q.Where(x => x.UserId == uid);

            q = FilterEngine.Apply(q, query, QuestionFilterFields.Fields);

            var projected = q.ProjectTo<QuestionBaseDTO>(_mapper.ConfigurationProvider);
            return await PagedResponse<QuestionBaseDTO>.CreateAsync(
                projected, query.Page, query.PageSize, ct);
        }

        // Typed variants of the search above — same framework, but they return the rich
        // per-type DTOs (answer options, correct answer, …) the type-tabbed UI renders.
        public Task<PagedResponse<MultipleChoiceQuestionDTO>> SearchMultipleChoiceQuestionsAsync(
            FilterQuery query, Guid? restrictToUserId = null, CancellationToken ct = default) =>
            SearchTypedAsync<MultipleChoiceQuestion, MultipleChoiceQuestionDTO>(
                _questions.QueryMultipleChoice(), query, restrictToUserId, ct);

        public Task<PagedResponse<TrueFalseQuestionDTO>> SearchTrueFalseQuestionsAsync(
            FilterQuery query, Guid? restrictToUserId = null, CancellationToken ct = default) =>
            SearchTypedAsync<TrueFalseQuestion, TrueFalseQuestionDTO>(
                _questions.QueryTrueFalse(), query, restrictToUserId, ct);

        public Task<PagedResponse<TypeTheAnswerQuestionDTO>> SearchTypeTheAnswerQuestionsAsync(
            FilterQuery query, Guid? restrictToUserId = null, CancellationToken ct = default) =>
            SearchTypedAsync<TypeTheAnswerQuestion, TypeTheAnswerQuestionDTO>(
                _questions.QueryTypeTheAnswer(), query, restrictToUserId, ct);

        // Shared core for the typed searches: scope clamp → framework filter → project → page.
        // The repository supplies the type-specific base query (with its includes); everything
        // else is identical, so the filtering/sorting/paging logic lives in exactly one place.
        private async Task<PagedResponse<TDto>> SearchTypedAsync<TEntity, TDto>(
            IQueryable<TEntity> source, FilterQuery query, Guid? restrictToUserId, CancellationToken ct)
            where TEntity : QuestionBase
        {
            if (restrictToUserId is { } uid)
                source = source.Where(x => x.UserId == uid);

            source = FilterEngine.Apply(source, query, QuestionFilterFields.For<TEntity>());

            var projected = source.ProjectTo<TDto>(_mapper.ConfigurationProvider);
            return await PagedResponse<TDto>.CreateAsync(projected, query.Page, query.PageSize, ct);
        }

        public async Task<QuestionBaseDTO> GetQuestionByIdAsync(int id)
        {
            var question = await _questions.GetBaseByIdAsync(id);
            if (question == null)
                return null;

            return question.Type switch
            {
                QuestionType.MultipleChoice =>
                    _mapper.Map<MultipleChoiceQuestionDTO>(await _questions.GetMultipleChoiceByIdAsync(id)),
                QuestionType.TrueFalse =>
                    _mapper.Map<TrueFalseQuestionDTO>(await _questions.GetTrueFalseByIdAsync(id)),
                QuestionType.TypeTheAnswer =>
                    _mapper.Map<TypeTheAnswerQuestionDTO>(await _questions.GetTypeTheAnswerByIdAsync(id)),
                _ => _mapper.Map<QuestionBaseDTO>(question),
            };
        }

        public Task<Guid?> GetQuestionOwnerAsync(int questionId) =>
            _questions.GetOwnerIdAsync(questionId);

        public async Task<PagedList<MultipleChoiceQuestionDTO>> GetPaginatedMultipleChoiceQuestionsAsync(QuestionFilterParams filterParams)
        {
            var query = ApplyFilters(_questions.QueryMultipleChoice(), filterParams);
            var projected = query.ProjectTo<MultipleChoiceQuestionDTO>(_mapper.ConfigurationProvider);

            return await PagedList<MultipleChoiceQuestionDTO>.CreateAsync(
                projected, filterParams.PageNumber, filterParams.PageSize);
        }

        public async Task<PagedList<TrueFalseQuestionDTO>> GetPaginatedTrueFalseQuestionsAsync(QuestionFilterParams filterParams)
        {
            var query = ApplyFilters(_questions.QueryTrueFalse(), filterParams);
            var projected = query.ProjectTo<TrueFalseQuestionDTO>(_mapper.ConfigurationProvider);

            return await PagedList<TrueFalseQuestionDTO>.CreateAsync(
                projected, filterParams.PageNumber, filterParams.PageSize);
        }

        public async Task<PagedList<TypeTheAnswerQuestionDTO>> GetPaginatedTypeTheAnswerQuestionsAsync(QuestionFilterParams filterParams)
        {
            var query = ApplyFilters(_questions.QueryTypeTheAnswer(), filterParams);
            var projected = query.ProjectTo<TypeTheAnswerQuestionDTO>(_mapper.ConfigurationProvider);

            return await PagedList<TypeTheAnswerQuestionDTO>.CreateAsync(
                projected, filterParams.PageNumber, filterParams.PageSize);
        }

        // ── Creates ─────────────────────────────────────────────────────────────────
        public async Task<MultipleChoiceQuestionDTO> CreateMultipleChoiceQuestionAsync(MultipleChoiceQuestionCM questionCM, Guid userId)
        {
            var question = _mapper.Map<MultipleChoiceQuestion>(questionCM);

            foreach (var answerOption in question.AnswerOptions)
                answerOption.Question = question;

            if (!question.AnswerOptions.Any(a => a.IsCorrect))
                throw new InvalidOperationException("At least one answer option must be marked as correct.");

            question.UserId = userId;
            question.CreatedAt = DateTime.UtcNow;
            question.Type = QuestionType.MultipleChoice;
            question.Visibility = Enum.TryParse(questionCM.Visibility, true, out QuestionVisibility vis)
                ? vis : QuestionVisibility.Private;

            await _questions.AddMultipleChoiceAsync(question);
            await _questions.SaveChangesAsync();

            if (!string.IsNullOrEmpty(questionCM.ImageUrl))
                await _imageService.AssociateImageWithEntityAsync(questionCM.ImageUrl, "Question", question.Id);

            var created = await _questions.GetMultipleChoiceByIdAsync(question.Id);
            return _mapper.Map<MultipleChoiceQuestionDTO>(created);
        }

        public async Task<TrueFalseQuestionDTO> CreateTrueFalseQuestionAsync(TrueFalseQuestionCM questionCM, Guid userId)
        {
            var question = _mapper.Map<TrueFalseQuestion>(questionCM);

            question.UserId = userId;
            question.CreatedAt = DateTime.UtcNow;
            question.Type = QuestionType.TrueFalse;
            question.Visibility = Enum.TryParse(questionCM.Visibility, true, out QuestionVisibility vis)
                ? vis : QuestionVisibility.Global;

            await _questions.AddTrueFalseAsync(question);
            await _questions.SaveChangesAsync();

            if (!string.IsNullOrEmpty(questionCM.ImageUrl))
                await _imageService.AssociateImageWithEntityAsync(questionCM.ImageUrl, "Question", question.Id);

            var created = await _questions.GetTrueFalseByIdAsync(question.Id);
            return _mapper.Map<TrueFalseQuestionDTO>(created);
        }

        public async Task<TypeTheAnswerQuestionDTO> CreateTypeTheAnswerQuestionAsync(TypeTheAnswerQuestionCM questionCM, Guid userId)
        {
            var question = _mapper.Map<TypeTheAnswerQuestion>(questionCM);

            question.UserId = userId;
            question.CreatedAt = DateTime.UtcNow;
            question.Type = QuestionType.TypeTheAnswer;
            question.Visibility = Enum.TryParse(questionCM.Visibility, true, out QuestionVisibility vis)
                ? vis : QuestionVisibility.Global;

            await _questions.AddTypeTheAnswerAsync(question);
            await _questions.SaveChangesAsync();

            if (!string.IsNullOrEmpty(questionCM.ImageUrl))
                await _imageService.AssociateImageWithEntityAsync(questionCM.ImageUrl, "Question", question.Id);

            var created = await _questions.GetTypeTheAnswerByIdAsync(question.Id);
            return _mapper.Map<TypeTheAnswerQuestionDTO>(created);
        }

        // ── Updates ───────────────────────────────────────────────────────────────
        // canUpdateAny comes from the controller's permission check; when false the repository
        // clamps the lookup to the caller's own questions.
        public async Task<MultipleChoiceQuestionDTO> UpdateMultipleChoiceQuestionAsync(
            MultipleChoiceQuestionUM questionUM, Guid userId, bool canUpdateAny)
        {
            var existingQuestion = await _questions.GetMultipleChoiceForUpdateAsync(
                questionUM.Id, canUpdateAny ? null : userId);
            if (existingQuestion == null) return null;

            _mapper.Map(questionUM, existingQuestion);

            if (Enum.TryParse(questionUM.Visibility, true, out QuestionVisibility vis))
                existingQuestion.Visibility = vis;

            await _answerOptionService.SyncAnswerOptionsAsync(existingQuestion, questionUM.AnswerOptions);

            if (!string.IsNullOrEmpty(questionUM.ImageUrl))
                await _imageService.AssociateImageWithEntityAsync(questionUM.ImageUrl, "Question", existingQuestion.Id);

            await _questions.SaveChangesAsync();

            var updated = await _questions.GetMultipleChoiceByIdAsync(existingQuestion.Id);
            return _mapper.Map<MultipleChoiceQuestionDTO>(updated);
        }

        public async Task<TrueFalseQuestionDTO> UpdateTrueFalseQuestionAsync(
            TrueFalseQuestionUM questionUM, Guid userId, bool canUpdateAny)
        {
            var existingQuestion = await _questions.GetTrueFalseForUpdateAsync(
                questionUM.Id, canUpdateAny ? null : userId);
            if (existingQuestion == null) return null;

            _mapper.Map(questionUM, existingQuestion);

            if (Enum.TryParse(questionUM.Visibility, true, out QuestionVisibility visibility))
                existingQuestion.Visibility = visibility;

            if (!string.IsNullOrEmpty(questionUM.ImageUrl))
                await _imageService.AssociateImageWithEntityAsync(questionUM.ImageUrl, "Question", existingQuestion.Id);

            await _questions.SaveChangesAsync();

            var updated = await _questions.GetTrueFalseByIdAsync(existingQuestion.Id);
            return _mapper.Map<TrueFalseQuestionDTO>(updated);
        }

        public async Task<TypeTheAnswerQuestionDTO> UpdateTypeTheAnswerQuestionAsync(
            TypeTheAnswerQuestionUM questionUM, Guid userId, bool canUpdateAny)
        {
            var existingQuestion = await _questions.GetTypeTheAnswerForUpdateAsync(
                questionUM.Id, canUpdateAny ? null : userId);
            if (existingQuestion == null) return null;

            _mapper.Map(questionUM, existingQuestion);

            if (Enum.TryParse(questionUM.Visibility, true, out QuestionVisibility visibility))
                existingQuestion.Visibility = visibility;

            if (!string.IsNullOrEmpty(questionUM.ImageUrl))
                await _imageService.AssociateImageWithEntityAsync(questionUM.ImageUrl, "Question", existingQuestion.Id);

            await _questions.SaveChangesAsync();

            var updated = await _questions.GetTypeTheAnswerByIdAsync(existingQuestion.Id);
            return _mapper.Map<TypeTheAnswerQuestionDTO>(updated);
        }

        // ── Delete ────────────────────────────────────────────────────────────────
        public async Task<(bool Success, string? ErrorMessage, bool IsCustomMessage)> DeleteQuestionAsync(int id, Guid userId, bool canDeleteAny)
        {
            var question = await _questions.GetTrackedByIdAsync(id);

            if (question == null)
                return (false, "Question not found.", true);

            if (!canDeleteAny && question.UserId != userId)
                return (false, "You're not authorized to delete this question.", true);

            if (await _questions.IsUsedInAnyQuizAsync(id))
                return (false, "This question is being used in a quiz and cannot be deleted.", true);

            try
            {
                if (!string.IsNullOrEmpty(question.ImageUrl))
                    await _imageService.DeleteAssociatedImageAsync(question.ImageUrl, "Question", question.Id);

                _questions.Remove(question);
                await _questions.SaveChangesAsync();

                return (true, null, false);
            }
            catch (Exception)
            {
                return (false, "An error occurred while deleting the question.", false);
            }
        }

        public async Task<List<QuestionBaseDTO>> GetQuestionsByCategoryAsync(int categoryId)
        {
            var questions = await _questions.Query().Where(q => q.CategoryId == categoryId).ToListAsync();
            return _mapper.Map<List<QuestionBaseDTO>>(questions);
        }

        public async Task<List<QuestionBaseDTO>> GetQuestionsByDifficultyAsync(int difficultyId)
        {
            var questions = await _questions.Query().Where(q => q.DifficultyId == difficultyId).ToListAsync();
            return _mapper.Map<List<QuestionBaseDTO>>(questions);
        }

        public async Task<List<QuestionBaseDTO>> GetQuestionsByUserAsync(Guid userId)
        {
            var questions = await _questions.Query().Where(q => q.UserId == userId).ToListAsync();
            return _mapper.Map<List<QuestionBaseDTO>>(questions);
        }

        // Legacy QuestionFilterParams filtering (predates the shared FilterEngine). Pure query
        // composition over IQueryable, so it stays in the service rather than the repository.
        private static IQueryable<T> ApplyFilters<T>(IQueryable<T> query, QuestionFilterParams filterParams) where T : QuestionBase
        {
            if (!string.IsNullOrEmpty(filterParams.SearchTerm))
            {
                var searchTerm = filterParams.SearchTerm.ToLower();
                query = query.Where(q => q.Text.ToLower().Contains(searchTerm));
            }

            if (filterParams.CategoryId.HasValue)
                query = query.Where(q => q.CategoryId == filterParams.CategoryId.Value);

            if (filterParams.DifficultyId.HasValue)
                query = query.Where(q => q.DifficultyId == filterParams.DifficultyId.Value);

            if (filterParams.LanguageId.HasValue)
                query = query.Where(q => q.LanguageId == filterParams.LanguageId.Value);

            if (!string.IsNullOrEmpty(filterParams.Visibility)
                && Enum.TryParse(filterParams.Visibility, true, out QuestionVisibility visibilityEnum))
            {
                query = query.Where(q => q.Visibility == visibilityEnum);
            }

            if (filterParams.Type.HasValue)
                query = query.Where(q => q.Type == filterParams.Type.Value);

            if (filterParams.UserId.HasValue)
                query = query.Where(q => q.UserId == filterParams.UserId.Value);

            return query;
        }
    }
}
