using Microsoft.EntityFrameworkCore;
using QuizAPI.Controllers.Questions;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.Filtering;
using QuizAPI.Mapping;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    /// <inheritdoc cref="IQuestionCategoryRepository"/>
    public class QuestionCategoryRepository : IQuestionCategoryRepository
    {
        private readonly ApplicationDbContext _context;

        public QuestionCategoryRepository(ApplicationDbContext context) => _context = context;

        public Task<List<QuestionCategoryDTO>> GetAllAsync(CancellationToken ct = default) =>
            _context.QuestionCategories
                .AsNoTracking()
                .Select(SecondaryMappers.ProjectCategory)
                .ToListAsync(ct);

        public Task<PagedResponse<QuestionCategoryAdminDTO>> SearchAsync(
            FilterQuery query, CancellationToken ct = default)
        {
            var source = FilterEngine.Apply(
                _context.QuestionCategories.AsNoTracking(), query, CategoryFilterFields.Fields);

            return PagedResponse<QuestionCategoryAdminDTO>.CreateAsync(
                source.Select(SecondaryMappers.ProjectCategoryAdmin), query.Page, query.PageSize, ct);
        }

        public Task<QuestionCategoryDTO?> GetByIdAsync(int id, CancellationToken ct = default) =>
            _context.QuestionCategories
                .AsNoTracking()
                .Where(c => c.Id == id)
                .Select(SecondaryMappers.ProjectCategory)
                .FirstOrDefaultAsync(ct)!;

        public Task<QuestionCategory?> GetTrackedByIdAsync(int id, CancellationToken ct = default) =>
            _context.QuestionCategories.FirstOrDefaultAsync(c => c.Id == id, ct);

        // Compared with the trimmed, case-folded name so " science " and "Science" collide.
        // EF translates ToLower() to SQL LOWER(); Trim() is applied to the incoming value in
        // memory rather than per row, so no function wraps the column being scanned.
        public Task<bool> NameExistsAsync(
            string name, int? excludeId = null, CancellationToken ct = default)
        {
            var needle = (name ?? string.Empty).Trim().ToLower();

            return _context.QuestionCategories
                .AsNoTracking()
                .AnyAsync(c => c.Name.ToLower() == needle
                               && (excludeId == null || c.Id != excludeId), ct);
        }

        public async Task AddAsync(QuestionCategory category, CancellationToken ct = default) =>
            await _context.QuestionCategories.AddAsync(category, ct);

        public void Remove(QuestionCategory category) =>
            _context.QuestionCategories.Remove(category);

        public Task SaveChangesAsync(CancellationToken ct = default) =>
            _context.SaveChangesAsync(ct);
    }
}
