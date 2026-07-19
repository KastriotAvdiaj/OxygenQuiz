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
        private readonly IQuestionRepository _questions;
        private readonly ILogger<QuizService> _logger;
        private readonly IImageService _imageService;

        public QuizService(
            IQuizRepository quizzes,
            IQuestionRepository questions,
            ILogger<QuizService> logger,
            IImageService imageService)
        {
            _quizzes = quizzes ?? throw new ArgumentNullException(nameof(quizzes));
            _questions = questions ?? throw new ArgumentNullException(nameof(questions));
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
        /// pagination). See docs/quiz/filtering.md. Quizzes are mapped to summary DTOs after
        /// materialising, so this uses the "map" overload of
        /// <see cref="PagedResponse{T}.CreateAsync"/>.
        ///
        /// The flags are server-enforced scope clamps applied BEFORE the client's filters:
        ///   - <paramref name="restrictToUserId"/>: only this user's quizzes ("my quizzes").
        ///   - <paramref name="publicOnly"/>: only active + published quizzes (public catalogue).
        ///   - <paramref name="includeDeleted"/>: admin-only; also returns soft-deleted quizzes.
        /// </summary>
        public async Task<PagedResponse<QuizSummaryDTO>> SearchQuizzesAsync(
            FilterQuery query,
            Guid? restrictToUserId = null,
            bool publicOnly = false,
            bool includeDeleted = false,
            CancellationToken ct = default)
        {
            IQueryable<Quiz> q = _quizzes.Query(includeDeleted);

            if (restrictToUserId is { } uid)
                q = q.Where(x => x.UserId == uid);

            if (publicOnly)
                q = q.Where(x => x.Status == QuizStatus.Public);

            q = FilterEngine.Apply(q, query, QuizFilterFields.Fields);

            // "variety" is a pseudo sort field (not in the whitelist, so FilterEngine ignored
            // it and applied the default sort — which this overrides). It interleaves
            // categories so the catalogue's first page shows the app's breadth; see
            // docs/quiz/quiz-discovery.md.
            if (QuizVarietyOrdering.IsRequested(query.Sort))
                q = QuizVarietyOrdering.Apply(q);

            return await PagedResponse<QuizSummaryDTO>.CreateAsync(
                q, query.Page, query.PageSize,
                rows => rows.ToSummaryDtoList(),
                ct);
        }

        public async Task<PagedList<QuizSummaryDTO>> GetPublicQuizzesAsync(QuizFilterParams filterParams)
        {
            try
            {
                var quizQuery = _quizzes.Query().Where(q => q.Status == QuizStatus.Public);
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

        public async Task<QuizDTO?> GetQuizByIdAsync(int id, Guid? currentUserId = null)
        {
            try
            {
                var quiz = await _quizzes.GetByIdAsync(id);
                if (quiz == null)
                    return null;

                var dto = quiz.ToDto();

                // The share-link token is the owner's secret — only ever surface it on the owner's
                // own read so it can't leak to other callers.
                if (currentUserId is { } uid && quiz.UserId == uid)
                    dto.ShareToken = quiz.ShareToken;

                return dto;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving quiz {QuizId}", id);
                throw;
            }
        }

        public async Task<QuizDTO?> GetQuizByShareTokenAsync(string shareToken)
        {
            if (string.IsNullOrWhiteSpace(shareToken))
                return null;

            try
            {
                // Bypasses the global query filter on purpose: an Unlisted quiz is invisible to
                // discovery, and the token IS the access grant. A Draft quiz is never reachable by
                // link even if a token somehow exists.
                var quiz = await _quizzes.GetByShareTokenAsync(shareToken);
                if (quiz == null || quiz.Status == QuizStatus.Draft)
                    return null;

                return quiz.ToDto();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving quiz by share token");
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

        public async Task<QuizDTO> CreateAiQuizAsync(Guid userId, AiQuizImportCM importCM)
        {
            using var transaction = await _quizzes.BeginTransactionAsync();

            try
            {
                // Quiz-level references must exist (and no entity is ever created here).
                var referencesExist = await _quizzes.ReferencedEntitiesExistAsync(
                    importCM.CategoryId, importCM.LanguageId, importCM.DifficultyId, userId);
                if (!referencesExist)
                    throw new InvalidOperationException("Category, Language, Difficulty, or User does not exist.");

                // Any existing questions being linked (picked from the bank during review) must exist.
                var existingIds = importCM.Questions
                    .Where(q => q.ExistingQuestionId is not null)
                    .Select(q => q.ExistingQuestionId!.Value)
                    .ToList();
                if (existingIds.Count > 0 && !await _quizzes.AllQuestionsExistAsync(existingIds))
                    throw new InvalidOperationException("One or more selected questions do not exist.");

                // New questions inherit the quiz's category + language; only difficulty may vary.
                // Validate every distinct new-question difficulty against existing rows so a bad id
                // fails with a clear message rather than an opaque FK error mid-transaction.
                var difficultyIds = importCM.Questions
                    .Where(q => q.ExistingQuestionId is null)
                    .Select(q => q.DifficultyId)
                    .Distinct();
                foreach (var difficultyId in difficultyIds)
                {
                    var ok = await _quizzes.ReferencedEntitiesExistAsync(
                        importCM.CategoryId, importCM.LanguageId, difficultyId);
                    if (!ok)
                        throw new InvalidOperationException($"Question difficulty {difficultyId} does not exist.");
                }

                var quiz = new Models.Quiz.Quiz
                {
                    Title = importCM.Title,
                    Description = importCM.Description,
                    CategoryId = importCM.CategoryId,
                    LanguageId = importCM.LanguageId,
                    DifficultyId = importCM.DifficultyId,
                    ShowFeedbackImmediately = importCM.ShowFeedbackImmediately,
                    ShuffleQuestions = importCM.ShuffleQuestions,
                    ImageUrl = importCM.ImageUrl,
                    Status = QuizMappers.ParseStatus(importCM.Status),
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    Version = 1,
                    // The overall quiz limit is the sum of the per-question limits, matching CreateQuizAsync.
                    TimeLimitInSeconds = importCM.Questions.Sum(q => q.TimeLimitInSeconds),
                };

                await _quizzes.AddAsync(quiz);

                var order = 1;
                var quizQuestions = new List<QuizQuestion>();
                foreach (var q in importCM.Questions)
                {
                    var quizQuestion = new QuizQuestion
                    {
                        Quiz = quiz,
                        OrderInQuiz = order++,
                        TimeLimitInSeconds = q.TimeLimitInSeconds,
                        PointSystem = Enum.TryParse<PointSystem>(q.PointSystem, true, out var ps)
                            ? ps : PointSystem.Standard,
                        CreatedInVersion = 1,
                    };

                    if (q.ExistingQuestionId is int existingId)
                    {
                        // Link an existing question by id — nothing is created for it.
                        quizQuestion.QuestionId = existingId;
                    }
                    else
                    {
                        // Build the question entity (Private, inheriting the quiz's category/language),
                        // add it via its typed set so EF stamps the correct TPH type, then link it to
                        // the quiz through the navigation property — EF assigns the FK on save.
                        var question = BuildAiQuestionEntity(q, importCM, userId);
                        await AddAiQuestionAsync(question);
                        quizQuestion.Question = question;
                    }

                    quizQuestions.Add(quizQuestion);
                }

                await _quizzes.AddQuizQuestionsAsync(quizQuestions);
                await _quizzes.SaveChangesAsync();
                await transaction.CommitAsync();

                if (!string.IsNullOrEmpty(importCM.ImageUrl))
                    await _imageService.AssociateImageWithEntityAsync(importCM.ImageUrl, "Quizzes", quiz.Id);

                return quiz.ToDto();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        /// <summary>
        /// Maps one inline AI-import question to a question entity. Category and Language are taken
        /// from the quiz (never the question payload); visibility is always Private.
        /// </summary>
        private static QuestionBase BuildAiQuestionEntity(
            AiImportQuestionCM q, AiQuizImportCM quiz, Guid userId)
        {
            if (string.IsNullOrWhiteSpace(q.Type))
                throw new InvalidOperationException("A new question must have a type.");
            if (string.IsNullOrWhiteSpace(q.Text))
                throw new InvalidOperationException("A new question must have text.");

            QuestionBase question = q.Type switch
            {
                nameof(QuestionType.MultipleChoice) => new MultipleChoiceQuestion
                {
                    AllowMultipleSelections = q.AllowMultipleSelections,
                    AnswerOptions = (q.AnswerOptions ?? new List<DTOs.Question.AnswerOptionCM>())
                        .Select(a => new QuizAPI.Models.AnswerOption { Text = a.Text, IsCorrect = a.IsCorrect })
                        .ToList(),
                },
                nameof(QuestionType.TrueFalse) => new TrueFalseQuestion
                {
                    CorrectAnswer = q.CorrectAnswerBoolean ?? false,
                },
                nameof(QuestionType.TypeTheAnswer) => new TypeTheAnswerQuestion
                {
                    CorrectAnswer = q.CorrectAnswerText ?? string.Empty,
                    IsCaseSensitive = q.IsCaseSensitive,
                    AllowPartialMatch = q.AllowPartialMatch,
                    AcceptableAnswers = q.AcceptableAnswers ?? new List<string>(),
                },
                _ => throw new InvalidOperationException($"Unknown question type '{q.Type}'."),
            };

            question.Text = q.Text!;
            question.ImageUrl = q.ImageUrl;
            question.DifficultyId = q.DifficultyId;
            question.CategoryId = quiz.CategoryId;   // inherited
            question.LanguageId = quiz.LanguageId;   // inherited
            question.Visibility = QuestionVisibility.Private;
            question.UserId = userId;
            question.CreatedAt = DateTime.UtcNow;
            question.Type = Enum.Parse<QuestionType>(q.Type!, true);

            if (question is MultipleChoiceQuestion mc && !mc.AnswerOptions.Any(a => a.IsCorrect))
                throw new InvalidOperationException("At least one answer option must be marked as correct.");

            return question;
        }

        private async Task AddAiQuestionAsync(QuestionBase question)
        {
            switch (question)
            {
                case MultipleChoiceQuestion mc:
                    await _questions.AddMultipleChoiceAsync(mc);
                    break;
                case TrueFalseQuestion tf:
                    await _questions.AddTrueFalseAsync(tf);
                    break;
                case TypeTheAnswerQuestion tta:
                    await _questions.AddTypeTheAnswerAsync(tta);
                    break;
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
                quiz.ShowFeedbackImmediately = quizUM.ShowFeedbackImmediately;
                quiz.ShuffleQuestions = quizUM.ShuffleQuestions;
                quiz.Status = QuizMappers.ParseStatus(quizUM.Status);

                var newVersion = quiz.Version + 1;

                // Copy-on-write question diff (docs/quiz/quiz-editing.md): join rows are never updated
                // in place or hard-deleted, so in-flight sessions and historical UserAnswers keep
                // valid references. Removed/changed rows are retired via RemovedInVersion; changed
                // and added questions get fresh rows stamped with the new version.
                var diff = QuizQuestionVersioning.Diff(
                    quiz.QuizQuestions, quizUM.Questions.ToList(), quiz.Id, newVersion);

                foreach (var row in diff.ToRetire)
                    row.RemovedInVersion = newVersion;

                await _quizzes.AddQuizQuestionsAsync(diff.ToAdd);

                quiz.Version = newVersion;
                quiz.TimeLimitInSeconds = quizUM.Questions.Sum(q => q.TimeLimitInSeconds);

                await _quizzes.SaveChangesAsync();
                await transaction.CommitAsync();

                return await GetQuizByIdAsync(quiz.Id, userId);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error updating quiz {QuizId} for user {UserId}", quizUM.Id, userId);
                throw;
            }
        }

        public async Task<QuizDTO?> SetQuizStatusAsync(Guid userId, int quizId, QuizStatus status)
        {
            try
            {
                var quiz = await _quizzes.GetTrackedAsync(quizId);
                if (quiz == null)
                    return null;

                if (quiz.UserId != userId)
                {
                    _logger.LogWarning("User {UserId} attempted to change status of quiz {QuizId} owned by {OwnerId}",
                        userId, quizId, quiz.UserId);
                    return null;
                }

                quiz.Status = status;
                quiz.Version += 1;

                await _quizzes.SaveChangesAsync();

                return await GetQuizByIdAsync(quizId, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting status for quiz {QuizId}", quizId);
                throw;
            }
        }

        public async Task<string?> GenerateShareTokenAsync(Guid userId, int quizId)
        {
            try
            {
                var quiz = await _quizzes.GetTrackedAsync(quizId);
                if (quiz == null)
                    return null;

                if (quiz.UserId != userId)
                {
                    _logger.LogWarning("User {UserId} attempted to generate a share link for quiz {QuizId} owned by {OwnerId}",
                        userId, quizId, quiz.UserId);
                    return null;
                }

                // Generate lazily and reuse the existing token so the owner's link stays stable.
                if (string.IsNullOrEmpty(quiz.ShareToken))
                {
                    quiz.ShareToken = GenerateToken();
                    await _quizzes.SaveChangesAsync();
                }

                return quiz.ShareToken;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating share token for quiz {QuizId}", quizId);
                throw;
            }
        }

        public async Task<bool> CanHostQuizAsync(int quizId, Guid hostUserId)
        {
            var quiz = await _quizzes.GetByIdUnfilteredAsync(quizId);
            if (quiz == null)
                return false;

            // A host may run a Public quiz or any quiz they own (Draft/Unlisted included — the lobby
            // membership becomes the access grant for invited participants).
            return quiz.Status == QuizStatus.Public || quiz.UserId == hostUserId;
        }

        // 16 random bytes → 32 hex chars: unguessable and URL-safe.
        private static string GenerateToken() =>
            Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();

        public async Task<bool> DeleteQuizAsync(Guid userId, int quizId, bool isAdmin = false)
        {
            try
            {
                // GetTrackedAsync honours the global query filter, so an already soft-deleted quiz
                // reads back as null and we return false (treated as 404) — idempotent delete.
                var quiz = await _quizzes.GetTrackedAsync(quizId);
                if (quiz == null)
                    return false;

                // Owners can delete their own quizzes; admins / super-admins can delete any quiz.
                if (!isAdmin && quiz.UserId != userId)
                {
                    _logger.LogWarning("User {UserId} attempted to delete quiz {QuizId} owned by {OwnerId}",
                        userId, quizId, quiz.UserId);
                    return false;
                }

                // Soft delete: stamp DeletedAt instead of removing the row. The quiz disappears from
                // every list (global query filter) while its QuizSessions / UserAnswers — i.e. the
                // played matches — stay valid. No FK juggling, so quizzes that have been played
                // delete cleanly instead of throwing on the QuizSession Restrict constraint.
                quiz.DeletedAt = DateTime.UtcNow;
                await _quizzes.SaveChangesAsync();

                _logger.LogInformation("Quiz {QuizId} soft-deleted by user {UserId}", quizId, userId);
                return true;
            }
            catch (Exception ex)
            {
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

            if (!string.IsNullOrEmpty(filterParams.Status)
                && Enum.TryParse<QuizStatus>(filterParams.Status, ignoreCase: true, out var status))
                query = query.Where(q => q.Status == status);

            if (filterParams.UserId.HasValue)
                query = query.Where(q => q.UserId == filterParams.UserId.Value);

            return query;
        }
    }
}
