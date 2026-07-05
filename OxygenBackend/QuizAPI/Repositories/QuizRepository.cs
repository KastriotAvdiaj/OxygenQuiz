using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using QuizAPI.Data;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    /// <summary>EF Core implementation of <see cref="IQuizRepository"/>.</summary>
    public class QuizRepository : IQuizRepository
    {
        private readonly ApplicationDbContext _context;

        public QuizRepository(ApplicationDbContext context) => _context = context;

        // Standard navigations the quiz summary/detail DTOs need.
        private static IQueryable<Quiz> WithRelations(IQueryable<Quiz> source) =>
            source.Include(q => q.User)
                  .Include(q => q.Category)
                  .Include(q => q.Language)
                  .Include(q => q.Difficulty)
                  .Include(q => q.QuizQuestions);

        public IQueryable<Quiz> Query(bool includeDeleted = false)
        {
            IQueryable<Quiz> quizzes = _context.Quizzes.AsNoTracking();
            if (includeDeleted)
                quizzes = quizzes.IgnoreQueryFilters(); // admin: surface soft-deleted quizzes too
            return WithRelations(quizzes);
        }

        public Task<Quiz?> GetByIdAsync(int id, CancellationToken ct = default) =>
            WithRelations(_context.Quizzes.AsNoTracking()).FirstOrDefaultAsync(q => q.Id == id, ct);

        public Task<bool> ExistsAsync(int id, CancellationToken ct = default) =>
            _context.Quizzes.AsNoTracking().AnyAsync(q => q.Id == id, ct);

        public Task<Quiz?> GetByShareTokenAsync(string shareToken, CancellationToken ct = default) =>
            // IgnoreQueryFilters() also disables the soft-delete filter, so DeletedAt is checked here.
            WithRelations(_context.Quizzes.AsNoTracking().IgnoreQueryFilters())
                .FirstOrDefaultAsync(q => q.ShareToken == shareToken && q.DeletedAt == null, ct);

        public Task<Quiz?> GetByIdUnfilteredAsync(int id, CancellationToken ct = default) =>
            // Bypasses the discovery filter (Unlisted/Draft included); soft-deleted still excluded.
            // Used by authorization checks that must see the quiz regardless of who is asking.
            _context.Quizzes.AsNoTracking().IgnoreQueryFilters()
                .FirstOrDefaultAsync(q => q.Id == id && q.DeletedAt == null, ct);

        public async Task<List<QuizQuestion>> GetQuizQuestionsAsync(
            int quizId, bool ignoreFilters = false, CancellationToken ct = default)
        {
            // When ignoreFilters is set the QuestionBase discovery filter is bypassed. The live
            // multiplayer match uses this: it runs in a background scope (no current user), so an
            // owned Unlisted quiz's questions would otherwise be filtered out. The caller is
            // responsible for having authorized access to the quiz first.
            var query = _context.QuizQuestions.AsNoTracking();
            if (ignoreFilters)
                query = query.IgnoreQueryFilters();

            return await query
                .Include(qq => qq.Question)
                    .ThenInclude(q => ((MultipleChoiceQuestion)q).AnswerOptions)
                .Include(qq => qq.Question)
                    .ThenInclude(q => q.Category)
                .Include(qq => qq.Question)
                    .ThenInclude(q => q.Difficulty)
                .Include(qq => qq.Question)
                    .ThenInclude(q => q.Language)
                .Include(qq => qq.Question)
                    .ThenInclude(q => q.User)
                .Where(qq => qq.QuizId == quizId)
                // Only live rows — retired (edited-away) rows belong to past versions and are
                // only ever served to sessions pinned to those versions (docs/quiz/quiz-editing.md).
                .Where(qq => qq.RemovedInVersion == null)
                .OrderBy(qq => qq.OrderInQuiz)
                .ToListAsync(ct);
        }

        // ── Tracked reads for mutation ────────────────────────────────────────────
        public Task<Quiz?> GetWithQuestionsForUpdateAsync(int id, CancellationToken ct = default) =>
            _context.Quizzes
                // The update diff only compares against the quiz's current content, so retired
                // rows are left out (they must never be touched again once retired).
                .Include(q => q.QuizQuestions.Where(qq => qq.RemovedInVersion == null))
                .FirstOrDefaultAsync(q => q.Id == id, ct);

        public Task<Quiz?> GetTrackedAsync(int id, CancellationToken ct = default) =>
            _context.Quizzes.FirstOrDefaultAsync(q => q.Id == id, ct);

        // ── Validation helpers ────────────────────────────────────────────────────
        public async Task<bool> ReferencedEntitiesExistAsync(
            int categoryId, int languageId, int difficultyId, Guid? userId = null, CancellationToken ct = default)
        {
            var categoryExists = await _context.QuestionCategories.AnyAsync(c => c.Id == categoryId, ct);
            var languageExists = await _context.QuestionLanguages.AnyAsync(l => l.Id == languageId, ct);
            var difficultyExists = await _context.QuestionDifficulties.AnyAsync(d => d.ID == difficultyId, ct);
            var userExists = userId is not { } uid || await _context.Users.AnyAsync(u => u.Id == uid, ct);

            return categoryExists && languageExists && difficultyExists && userExists;
        }

        public async Task<bool> AllQuestionsExistAsync(IReadOnlyCollection<int> questionIds, CancellationToken ct = default)
        {
            var distinctIds = questionIds.Distinct().ToList();
            if (distinctIds.Count == 0) return true;

            var existingCount = await _context.Questions.CountAsync(q => distinctIds.Contains(q.Id), ct);
            return existingCount == distinctIds.Count;
        }

        // ── Writes ────────────────────────────────────────────────────────────────
        public async Task AddAsync(Quiz quiz, CancellationToken ct = default) =>
            await _context.Quizzes.AddAsync(quiz, ct);

        public async Task AddQuizQuestionsAsync(IEnumerable<QuizQuestion> quizQuestions, CancellationToken ct = default) =>
            await _context.QuizQuestions.AddRangeAsync(quizQuestions, ct);

        public async Task AddQuizQuestionAsync(QuizQuestion quizQuestion, CancellationToken ct = default) =>
            await _context.QuizQuestions.AddAsync(quizQuestion, ct);

        // NOTE: QuizQuestion rows are never hard-deleted (docs/quiz/quiz-editing.md) — edits retire
        // rows by stamping RemovedInVersion instead, so session/answer FKs stay valid forever.

        public void Remove(Quiz quiz) => _context.Quizzes.Remove(quiz);

        public Task<int> SaveChangesAsync(CancellationToken ct = default) => _context.SaveChangesAsync(ct);

        public Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default) =>
            _context.Database.BeginTransactionAsync(ct);
    }
}
