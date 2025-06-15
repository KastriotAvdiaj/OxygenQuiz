
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using System.Linq;

namespace QuizAPI.Controllers.Quizzes.Services.QuizServices
{
    public class QuizService : IQuizService
    {
        private readonly ApplicationDbContext _context;
        private readonly IMapper _mapper;
        private readonly ILogger<QuizService> _logger;

        public QuizService(
            ApplicationDbContext context,
            IMapper mapper,
            ILogger<QuizService> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<PagedList<QuizSummaryDTO>> GetAllQuizzesAsync(QuizFilterParams filterParams)
        {
            try
            {
                var quizQuery = _context.Quizzes
                    .Include(q => q.User)
                    .Include(q => q.Category)
                    .Include(q => q.Language)
                    .Include(q => q.Difficulty)
                    .Include(q => q.QuizQuestions)
                    .AsQueryable();

                // Apply filters
                quizQuery = ApplyQuizFilters(quizQuery, filterParams);

                // Apply pagination and convert to DTO
                var pagedQuizzes = await PagedList<Quiz>.CreateAsync(quizQuery, filterParams.PageNumber, filterParams.PageSize);

                var quizDtos = _mapper.Map<List<QuizSummaryDTO>>(pagedQuizzes.Items);

                return new PagedList<QuizSummaryDTO>(
                    quizDtos,
                    pagedQuizzes.TotalCount,
                    pagedQuizzes.PageNumber,
                    pagedQuizzes.PageSize
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all quizzes");
                throw;
            }
        }

        public async Task<PagedList<QuizSummaryDTO>> GetQuizzesByUserAsync(Guid userId, QuizFilterParams filterParams)
        {
            try
            {
                var quizQuery = _context.Quizzes
                    .Include(q => q.User)
                    .Include(q => q.Category)
                    .Include(q => q.Language)
                    .Include(q => q.Difficulty)
                    .Include(q => q.QuizQuestions)
                    .Where(q => q.UserId == userId)
                    .AsQueryable();

                // Apply filters
                quizQuery = ApplyQuizFilters(quizQuery, filterParams);

                // Apply pagination and convert to DTO
                var pagedQuizzes = await PagedList<Quiz>.CreateAsync(quizQuery, filterParams.PageNumber, filterParams.PageSize);

                var quizDtos = _mapper.Map<List<QuizSummaryDTO>>(pagedQuizzes.Items);

                return new PagedList<QuizSummaryDTO>(
                    quizDtos,
                    pagedQuizzes.TotalCount,
                    pagedQuizzes.PageNumber,
                    pagedQuizzes.PageSize
                );
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
                var quiz = await _context.Quizzes
                    .Include(q => q.User)
                    .Include(q => q.Category)
                    .Include(q => q.Language)
                    .Include(q => q.Difficulty)
                    .Include(q => q.QuizQuestions)
                    .ThenInclude(qq => qq.Question)
                    .FirstOrDefaultAsync(q => q.Id == id);

                return quiz == null ? null : _mapper.Map<QuizDTO>(quiz);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving quiz {QuizId}", id);
                throw;
            }
        }

        public async Task<QuizDTO> CreateQuizAsync(Guid userId, QuizCM quizCM)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Check if required entities exist
                var categoryExists = await _context.QuestionCategories.AnyAsync(c => c.Id == quizCM.CategoryId);
                var languageExists = await _context.QuestionLanguages.AnyAsync(l => l.Id == quizCM.LanguageId);
                var difficultyExists = await _context.QuestionDifficulties.AnyAsync(d => d.ID == quizCM.DifficultyId);
                var userExists = await _context.Users.AnyAsync(u => u.Id == userId);

                if (!categoryExists || !languageExists || !difficultyExists || !userExists)
                {
                    throw new InvalidOperationException("One or more required entities do not exist");
                }

                // Verify all questions exist
                var questionIds = quizCM.Questions.Select(q => q.QuestionId).ToList();
                var existingQuestionCount = await _context.Questions.CountAsync(q => questionIds.Contains(q.Id));

                if (existingQuestionCount != questionIds.Count)
                {
                    throw new InvalidOperationException("One or more questions do not exist");
                }

                // Create quiz
                var quiz = _mapper.Map<Quiz>(quizCM);
                quiz.UserId = userId;
                quiz.CreatedAt = DateTime.UtcNow;
                quiz.Version = 1;
                quiz.IsActive = true;

                await _context.Quizzes.AddAsync(quiz);
                await _context.SaveChangesAsync();

                // Add quiz questions
                var order = 1;
                foreach (var questionCM in quizCM.Questions)
                {
                    var quizQuestion = _mapper.Map<QuizQuestion>(questionCM);
                    quizQuestion.QuizId = quiz.Id;
                    quizQuestion.OrderInQuiz = questionCM.OrderInQuiz > 0 ? questionCM.OrderInQuiz : order++;

                    await _context.QuizQuestions.AddAsync(quizQuestion);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Return full quiz details
                return await GetQuizByIdAsync(quiz.Id);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error creating quiz for user {UserId}", userId);
                throw;
            }
        }

        public async Task<QuizDTO?> UpdateQuizAsync(Guid userId, QuizUM quizUM)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Retrieve quiz and verify ownership
                var quiz = await _context.Quizzes
                    .Include(q => q.QuizQuestions)
                    .FirstOrDefaultAsync(q => q.Id == quizUM.Id);

                if (quiz == null)
                {
                    return null;
                }

                if (quiz.UserId != userId)
                {
                    _logger.LogWarning("User {UserId} attempted to update quiz {QuizId} owned by {OwnerId}",
                        userId, quizUM.Id, quiz.UserId);
                    return null;
                }

                // Check for concurrency conflicts
                if (quiz.Version != quizUM.Version)
                {
                    throw new DbUpdateConcurrencyException("Quiz has been modified by another user");
                }

                // Check if required entities exist
                var categoryExists = await _context.QuestionCategories.AnyAsync(c => c.Id == quizUM.CategoryId);
                var languageExists = await _context.QuestionLanguages.AnyAsync(l => l.Id == quizUM.LanguageId);
                var difficultyExists = await _context.QuestionDifficulties.AnyAsync(d => d.ID == quizUM.DifficultyId);

                if (!categoryExists || !languageExists || !difficultyExists)
                {
                    throw new InvalidOperationException("One or more required entities do not exist");
                }

                // Verify all questions exist
                var questionIds = quizUM.Questions.Select(q => q.QuestionId).ToList();
                var existingQuestionCount = await _context.Questions.CountAsync(q => questionIds.Contains(q.Id));

                if (existingQuestionCount != questionIds.Count)
                {
                    throw new InvalidOperationException("One or more questions do not exist");
                }

                // Update quiz properties
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

                // Remove existing quiz questions
                _context.QuizQuestions.RemoveRange(quiz.QuizQuestions);

                // Add updated quiz questions
                foreach (var questionUM in quizUM.Questions)
                {
                    var quizQuestion = _mapper.Map<QuizQuestion>(questionUM);
                    quizQuestion.QuizId = quiz.Id;

                    await _context.QuizQuestions.AddAsync(quizQuestion);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Return full quiz details
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
                var quiz = await _context.Quizzes
                    .FirstOrDefaultAsync(q => q.Id == quizId);

                if (quiz == null)
                {
                    return null;
                }

                if (quiz.UserId != userId)
                {
                    _logger.LogWarning("User {UserId} attempted to toggle publish status of quiz {QuizId} owned by {OwnerId}",
                        userId, quizId, quiz.UserId);
                    return null;
                }

                quiz.IsPublished = !quiz.IsPublished;
                quiz.Version += 1;

                await _context.SaveChangesAsync();

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
                var quiz = await _context.Quizzes
                    .FirstOrDefaultAsync(q => q.Id == quizId);

                if (quiz == null)
                {
                    return null;
                }

                if (quiz.UserId != userId)
                {
                    _logger.LogWarning("User {UserId} attempted to toggle active status of quiz {QuizId} owned by {OwnerId}",
                        userId, quizId, quiz.UserId);
                    return null;
                }

                quiz.IsActive = !quiz.IsActive;
                quiz.Version += 1;

                await _context.SaveChangesAsync();

                return await GetQuizByIdAsync(quizId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling active status for quiz {QuizId}", quizId);
                throw;
            }
        }

        public async Task<IEnumerable<QuizSummaryDTO>> GetPublicQuizzesAsync()
        {
            try
            {
                var quizzes = await _context.Quizzes
                    .Include(q => q.User)
                    .Include(q => q.Category)
                    .Include(q => q.Language)
                    .Include(q => q.Difficulty)
                    .Include(q => q.QuizQuestions)
                    .Where(q => q.IsActive && q.IsPublished)
                    .ToListAsync();

                return _mapper.Map<List<QuizSummaryDTO>>(quizzes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving public quizzes");
                throw;
            }
        }

        public async Task<bool> DeleteQuizAsync(Guid userId, int quizId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Retrieve quiz and verify ownership
                var quiz = await _context.Quizzes
                    .Include(q => q.QuizQuestions)
                    .FirstOrDefaultAsync(q => q.Id == quizId);

                if (quiz == null)
                {
                    return false;
                }

                if (quiz.UserId != userId)
                {
                    _logger.LogWarning("User {UserId} attempted to delete quiz {QuizId} owned by {OwnerId}",
                        userId, quizId, quiz.UserId);
                    return false;
                }

                // Remove quiz questions first (due to foreign key constraints)
                if (quiz.QuizQuestions.Any())
                {
                    _context.QuizQuestions.RemoveRange(quiz.QuizQuestions);
                }

                // Remove the quiz
                _context.Quizzes.Remove(quiz);

                await _context.SaveChangesAsync();
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

        private static IQueryable<Quiz> ApplyQuizFilters(IQueryable<Quiz> query, QuizFilterParams filterParams)
        {
            // Active/Inactive filter - fixed to use IsActive property from filterParams
            if (filterParams.IsActive.HasValue)
            {
                query = query.Where(q => q.IsActive == filterParams.IsActive.Value);
            }

            // Search term filter
            if (!string.IsNullOrEmpty(filterParams.SearchTerm))
            {
                var searchTerm = filterParams.SearchTerm.ToLower();
                query = query.Where(q => q.Title.ToLower().Contains(searchTerm) ||
                                        q.Description.ToLower().Contains(searchTerm));
            }

            // Category filter
            if (filterParams.CategoryId.HasValue)
            {
                query = query.Where(q => q.CategoryId == filterParams.CategoryId.Value);
            }

            // Difficulty filter
            if (filterParams.DifficultyId.HasValue)
            {
                query = query.Where(q => q.DifficultyId == filterParams.DifficultyId.Value);
            }

            // Language filter
            if (filterParams.LanguageId.HasValue)
            {
                query = query.Where(q => q.LanguageId == filterParams.LanguageId.Value);
            }

            // Published filter - added missing filter
            if (filterParams.IsPublished.HasValue)
            {
                query = query.Where(q => q.IsPublished == filterParams.IsPublished.Value);
            }

            // User filter
            if (filterParams.UserId.HasValue)
            {
                query = query.Where(q => q.UserId == filterParams.UserId.Value);
            }

            return query;
        }
    }
}