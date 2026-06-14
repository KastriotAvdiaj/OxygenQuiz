using Microsoft.EntityFrameworkCore;
using QuizAPI.Controllers.Image.Services;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Filtering;
using QuizAPI.Mapping;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Controllers.Quizzes.Services.QuizServices
{
    /// <summary>
    /// Quiz business logic: filtering, validation, transactional create/update/delete, mapping and
    /// image association. All database access is delegated to <see cref="IQuizRepository"/>; the
    /// service keeps the transaction orchestration and logging. Public surface (IQuizService) is
    /// unchanged.
    /// </summary>
    public class QuizService : IQuizService
    {
        private readonly IQuizRepository _quizzes;
        private readonly ILogger<QuizService> _logger;
        private readonly IImageService _imageService;

        public QuizService(
            IQuizRepository quizzes,
            ILogger<QuizService> logger,
            IImageService imageService)
        {
            _quizzes = quizzes ?? throw new ArgumentNullException(nameof(quizzes));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _imageService = imageService ?? throw new ArgumentNullException(nameof(imageService));
        }

        // ── Reads ─────────────────────────────────────────────────────────────────
        public async Task<PagedList<QuizSummaryDTO>> GetAllQuizzesAsync(QuizFilterParams filterParams)
        {
            try
            {
                var quizQuery = ApplyQuizFilters(_quizzes.Query(), filterParams);
                return await ToSummaryPageAsync(quizQuery, filterParams);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all quizzes");
                throw;
            }
        }

        /// <summary>
        /// Shared filtering framework for quizzes (filters + search + sort + body-envelope
        /// pagination). See docs/filtering.md. Quizzes are mapped to summary DTOs after
        /// materialising, so this uses the "map" overload of
        /// <see cref="PagedResponse{T}.CreateAsync"/>.
        ///
        /// The two flags are server-enforced scope clamps applied BEFORE the client's filters:
        ///   - <paramref name="restrictToUserId"/>: only this user's quizzes ("my quizzes").
        ///   - <paramref name="publicOnly"/>: only active + published quizzes (public catalogue).
        /// </summary>
        public async Task<PagedResponse<QuizSummaryDTO>> SearchQuizzesAsync(
            FilterQuery query,
            Guid? restrictToUserId = null,
            bool publicOnly = false,
            CancellationToken ct = default)
        {
            IQueryable<Quiz> q = _quizzes.Query();

            if (restrictToUserId is { } uid)
                q = q.Where(x => x.UserId == uid);

            if (publicOnly)
                q = q.Where(x => x.IsActive && x.IsPublished);

            q = FilterEngine.Apply(q, query, QuizFilterFields.Fields);

            return await PagedResponse<QuizSummaryDTO>.CreateAsync(
                q, query.Page, query.PageSize,
                rows => rows.ToSummaryDtoList(),
                ct);
        }

        public async Task<PagedList<QuizSummaryDTO>> GetPublicQuizzesAsync(QuizFilterParams filterParams)
        {
            try
            {
                var quizQuery = _quizzes.Query().Where(q => q.IsActive && q.IsPublished);
                quizQuery = ApplyQuizFilters(quizQuery, filterParams);
                return await ToSummaryPageAsync(quizQuery, filterParams);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving public quizzes");
                throw;
            }
        }

        public async Task<PagedList<QuizSummaryDTO>> GetQuizzesByUserAsync(Guid userId, QuizFilterParams filterParams)
        {
            try
            {
                var quizQuery = _quizzes.Query().Where(q => q.UserId == userId);
                quizQuery = ApplyQuizFilters(quizQuery, filterParams);
                return await ToSummaryPageAsync(quizQuery, filterParams);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving quizzes for user {UserId}", userId);
                throw;
            }
        }

        public async Task<QuizDTO?> GetQuizByIdAsync(int id)
        {
            try
            {
                var quiz = await _quizzes.GetByIdAsync(id);
                return quiz?.ToDto();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving quiz {QuizId}", id);
                throw;
            }
        }

        public async Task<List<QuizQuestionDTO>?> GetQuizQuestionsAsync(int id)
        {
            try
            {
                if (!await _quizzes.ExistsAsync(id))
                    return null;

                var quizQuestions = await _quizzes.GetQuizQuestionsAsync(id);
                return quizQuestions.ToDtoList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving questions for quiz {QuizId}", id);
                throw;
            }
        }

        // ── Writes ────────────────────────────────────────────────────────────────
        public async Task<QuizDTO> CreateQuizAsync(Guid userId, QuizCM quizCM)
        {
            using var transaction = await _quizzes.BeginTransactionAsync();

            try
            {
                var referencesExist = await _quizzes.ReferencedEntitiesExistAsync(
                    quizCM.CategoryId, quizCM.LanguageId, quizCM.DifficultyId, userId);
                if (!referencesExist)
                    throw new InvalidOperationException("Category, Language, Difficulty, or User does not exist.");

                var questionIds = quizCM.Questions.Select(q => q.QuestionId).ToList();
                if (!await _quizzes.AllQuestionsExistAsync(questionIds))
                    throw new InvalidOperationException("One or more questions do not exist.");

                var quiz = quizCM.ToEntity();
                quiz.UserId = userId;
                quiz.CreatedAt = DateTime.UtcNow;
                quiz.Version = 1;
                quiz.IsActive = true;
                quiz.TimeLimitInSeconds = quizCM.Questions.Sum(q => q.TimeLimitInSeconds);

                await _quizzes.AddAsync(quiz);

                var order = 1;
                var quizQuestions = quizCM.Questions.Select(questionCM =>
                {
                    var quizQuestion = questionCM.ToEntity();
                    quizQuestion.Quiz = quiz;
                    quizQuestion.OrderInQuiz = order++;
                    return quizQuestion;
                });

                await _quizzes.AddQuizQuestionsAsync(quizQuestions);
                await _quizzes.SaveChangesAsync();
                await transaction.CommitAsync();

                if (!string.IsNullOrEmpty(quizCM.ImageUrl))
                    await _imageService.AssociateImageWithEntityAsync(quizCM.ImageUrl, "Quizzes", quiz.Id);

                return quiz.ToDto();
            }
            catch (Exception)
            {
                // Roll back the entire transaction, then bubble up to higher-level handling.
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<QuizDTO?> UpdateQuizAsync(Guid userId, QuizUM quizUM)
        {
            using var transaction = await _quizzes.BeginTransactionAsync();

            try
            {
                var quiz = await _quizzes.GetWithQuestionsForUpdateAsync(quizUM.Id);
                if (quiz == null)
                    return null;

                if (quiz.UserId != userId)
                {
                    _logger.LogWarning("User {UserId} attempted to update quiz {QuizId} owned by {OwnerId}",
                        userId, quizUM.Id, quiz.UserId);
                    return null;
                }

                // Optimistic concurrency: reject a stale edit.
                if (quiz.Version != quizUM.Version)
                    throw new DbUpdateConcurrencyException("Quiz has been modified by another user");

                var referencesExist = await _quizzes.ReferencedEntitiesExistAsync(
                    quizUM.CategoryId, quizUM.LanguageId, quizUM.DifficultyId);
                if (!referencesExist)
                    throw new InvalidOperationException("One or more required entities do not exist");

                var questionIds = quizUM.Questions.Select(q => q.QuestionId).ToList();
                if (!await _quizzes.AllQuestionsExistAsync(questionIds))
                    throw new InvalidOperationException("One or more questions do not exist");

                quiz.Title = quizUM.Title;
                quiz.Description = quizUM.Description;
                quiz.CategoryId = quizUM.CategoryId;
                quiz.LanguageId = quizUM.LanguageId;
                quiz.DifficultyId = quizUM.DifficultyId;
                quiz.TimeLimitInSeconds = quizUM.TimeLimitInSeconds;
                quiz.ShowFeedbackImmediately = quizUM.ShowFeedbackImmediately;
                quiz.ShuffleQuestions = quizUM.ShuffleQuestions;
                quiz.IsPublished = quizUM.IsPublished;
                quiz.IsActive = quizUM.IsActive;
                quiz.Version += 1;

                // Replace the join rows wholesale.
                _quizzes.RemoveQuizQuestions(quiz.QuizQuestions);

                foreach (var questionUM in quizUM.Questions)
                {
                    var quizQuestion = questionUM.ToEntity();
                    quizQuestion.QuizId = quiz.Id;
                    await _quizzes.AddQuizQuestionAsync(quizQuestion);
                }

                quiz.TimeLimitInSeconds = quizUM.Questions.Sum(q => q.TimeLimitInSeconds);

                await _quizzes.SaveChangesAsync();
                await transaction.CommitAsync();

                return await GetQuizByIdAsync(quiz.Id);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error updating quiz {QuizId} for user {UserId}", quizUM.Id, userId);
                throw;
            }
        }

        public async Task<QuizDTO?> ToggleQuizPublishStatusAsync(Guid userId, int quizId)
        {
            try
            {
                var quiz = await _quizzes.GetTrackedAsync(quizId);
                if (quiz == null)
                    return null;

                if (quiz.UserId != userId)
                {
                    _logger.LogWarning("User {UserId} attempted to toggle publish status of quiz {QuizId} owned by {OwnerId}",
                        userId, quizId, quiz.UserId);
                    return null;
                }

                quiz.IsPublished = !quiz.IsPublished;
                quiz.Version += 1;

                await _quizzes.SaveChangesAsync();

                return await GetQuizByIdAsync(quizId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling publish status for quiz {QuizId}", quizId);
                throw;
            }
        }

        public async Task<QuizDTO?> ToggleQuizActiveStatusAsync(Guid userId, int quizId)
        {
            try
            {
                var quiz = await _quizzes.GetTrackedAsync(quizId);
                if (quiz == null)
                    return null;

                if (quiz.UserId != userId)
                {
                    _logger.LogWarning("User {UserId} attempted to toggle active status of quiz {QuizId} owned by {OwnerId}",
                        userId, quizId, quiz.UserId);
                    return null;
                }

                quiz.IsActive = !quiz.IsActive;
                quiz.Version += 1;

                await _quizzes.SaveChangesAsync();

                return await GetQuizByIdAsync(quizId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling active status for quiz {QuizId}", quizId);
                throw;
            }
        }

        public async Task<bool> DeleteQuizAsync(Guid userId, int quizId)
        {
            using var transaction = await _quizzes.BeginTransactionAsync();

            try
            {
                var quiz = await _quizzes.GetWithQuestionsForUpdateAsync(quizId);
                if (quiz == null)
                    return false;

                if (quiz.UserId != userId)
                {
                    _logger.LogWarning("User {UserId} attempted to delete quiz {QuizId} owned by {OwnerId}",
                        userId, quizId, quiz.UserId);
                    return false;
                }

                // Remove the join rows first (FK constraints), then the quiz.
                if (quiz.QuizQuestions.Any())
                    _quizzes.RemoveQuizQuestions(quiz.QuizQuestions);

                _quizzes.Remove(quiz);

                await _quizzes.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Quiz {QuizId} deleted successfully by user {UserId}", quizId, userId);
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error deleting quiz {QuizId} for user {UserId}", quizId, userId);
                throw;
            }
        }

        // Materialise a filtered quiz query into a page of summary DTOs (map after paging).
        private async Task<PagedList<QuizSummaryDTO>> ToSummaryPageAsync(
            IQueryable<Quiz> quizQuery, QuizFilterParams filterParams)
        {
            var pagedQuizzes = await PagedList<Quiz>.CreateAsync(
                quizQuery, filterParams.PageNumber, filterParams.PageSize);

            var quizDtos = pagedQuizzes.Items.ToSummaryDtoList();

            return new PagedList<QuizSummaryDTO>(
                quizDtos,
                pagedQuizzes.TotalCount,
                pagedQuizzes.PageNumber,
                pagedQuizzes.PageSize);
        }

        // Legacy QuizFilterParams filtering (predates the shared FilterEngine). Pure query
        // composition over IQueryable, so it stays in the service rather than the repository.
        private static IQueryable<Quiz> ApplyQuizFilters(IQueryable<Quiz> query, QuizFilterParams filterParams)
        {
            if (filterParams.IsActive.HasValue)
                query = query.Where(q => q.IsActive == filterParams.IsActive.Value);

            if (!string.IsNullOrEmpty(filterParams.SearchTerm))
            {
                var searchTerm = filterParams.SearchTerm.ToLower();
                query = query.Where(q => q.Title.ToLower().Contains(searchTerm) ||
                                         q.Description.ToLower().Contains(searchTerm));
            }

            if (filterParams.CategoryId.HasValue)
                query = query.Where(q => q.CategoryId == filterParams.CategoryId.Value);

            if (filterParams.DifficultyId.HasValue)
                query = query.Where(q => q.DifficultyId == filterParams.DifficultyId.Value);

            if (filterParams.LanguageId.HasValue)
                query = query.Where(q => q.LanguageId == filterParams.LanguageId.Value);

            if (filterParams.IsPublished.HasValue)
                query = query.Where(q => q.IsPublished == filterParams.IsPublished.Value);

            if (filterParams.UserId.HasValue)
                query = query.Where(q => q.UserId == filterParams.UserId.Value);

            return query;
        }
    }
}
