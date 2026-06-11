using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    /// <summary>
    /// EF Core implementation of <see cref="IQuestionRepository"/>. The single place that knows
    /// how a question graph is loaded (which navigations, tracked vs. no-tracking).
    /// </summary>
    public class QuestionRepository : IQuestionRepository
    {
        private readonly ApplicationDbContext _context;

        public QuestionRepository(ApplicationDbContext context) => _context = context;

        // Standard navigations every question DTO needs.
        private static IQueryable<T> WithRelations<T>(IQueryable<T> source) where T : QuestionBase =>
            source.Include(q => q.Difficulty)
                  .Include(q => q.Category)
                  .Include(q => q.Language)
                  .Include(q => q.User);

        // ── Composable read queries ───────────────────────────────────────────────
        public IQueryable<QuestionBase> Query() =>
            WithRelations(_context.Questions.AsNoTracking());

        public IQueryable<MultipleChoiceQuestion> QueryMultipleChoice() =>
            WithRelations(_context.MultipleChoiceQuestions.AsNoTracking().Include(q => q.AnswerOptions));

        public IQueryable<TrueFalseQuestion> QueryTrueFalse() =>
            WithRelations(_context.TrueFalseQuestions.AsNoTracking());

        public IQueryable<TypeTheAnswerQuestion> QueryTypeTheAnswer() =>
            WithRelations(_context.TypeTheAnswerQuestions.AsNoTracking());

        // ── Single-item reads ─────────────────────────────────────────────────────
        public Task<QuestionBase?> GetBaseByIdAsync(int id, CancellationToken ct = default) =>
            Query().FirstOrDefaultAsync(q => q.Id == id, ct);

        public Task<MultipleChoiceQuestion?> GetMultipleChoiceByIdAsync(int id, CancellationToken ct = default) =>
            QueryMultipleChoice().FirstOrDefaultAsync(q => q.Id == id, ct);

        public Task<TrueFalseQuestion?> GetTrueFalseByIdAsync(int id, CancellationToken ct = default) =>
            QueryTrueFalse().FirstOrDefaultAsync(q => q.Id == id, ct);

        public Task<TypeTheAnswerQuestion?> GetTypeTheAnswerByIdAsync(int id, CancellationToken ct = default) =>
            QueryTypeTheAnswer().FirstOrDefaultAsync(q => q.Id == id, ct);

        public async Task<Guid?> GetOwnerIdAsync(int id, CancellationToken ct = default) =>
            await _context.Questions
                .Where(q => q.Id == id)
                .Select(q => (Guid?)q.UserId)
                .FirstOrDefaultAsync(ct);

        public Task<bool> IsUsedInAnyQuizAsync(int id, CancellationToken ct = default) =>
            _context.QuizQuestions.AnyAsync(qq => qq.QuestionId == id, ct);

        // ── Tracked reads for mutation ────────────────────────────────────────────
        public Task<MultipleChoiceQuestion?> GetMultipleChoiceForUpdateAsync(int id, Guid? ownerId, CancellationToken ct = default)
        {
            var query = _context.MultipleChoiceQuestions
                .Include(q => q.AnswerOptions)
                .Where(q => q.Id == id);

            if (ownerId is { } uid) query = query.Where(q => q.UserId == uid);
            return query.FirstOrDefaultAsync(ct);
        }

        public Task<TrueFalseQuestion?> GetTrueFalseForUpdateAsync(int id, Guid? ownerId, CancellationToken ct = default)
        {
            var query = _context.TrueFalseQuestions.Where(q => q.Id == id);
            if (ownerId is { } uid) query = query.Where(q => q.UserId == uid);
            return query.FirstOrDefaultAsync(ct);
        }

        public Task<TypeTheAnswerQuestion?> GetTypeTheAnswerForUpdateAsync(int id, Guid? ownerId, CancellationToken ct = default)
        {
            var query = _context.TypeTheAnswerQuestions.Where(q => q.Id == id);
            if (ownerId is { } uid) query = query.Where(q => q.UserId == uid);
            return query.FirstOrDefaultAsync(ct);
        }

        public Task<QuestionBase?> GetTrackedByIdAsync(int id, CancellationToken ct = default) =>
            _context.Questions.FirstOrDefaultAsync(q => q.Id == id, ct);

        // ── Writes ────────────────────────────────────────────────────────────────
        public async Task AddMultipleChoiceAsync(MultipleChoiceQuestion question, CancellationToken ct = default) =>
            await _context.MultipleChoiceQuestions.AddAsync(question, ct);

        public async Task AddTrueFalseAsync(TrueFalseQuestion question, CancellationToken ct = default) =>
            await _context.TrueFalseQuestions.AddAsync(question, ct);

        public async Task AddTypeTheAnswerAsync(TypeTheAnswerQuestion question, CancellationToken ct = default) =>
            await _context.TypeTheAnswerQuestions.AddAsync(question, ct);

        public void Remove(QuestionBase question) => _context.Questions.Remove(question);

        public Task<int> SaveChangesAsync(CancellationToken ct = default) => _context.SaveChangesAsync(ct);
    }
}
