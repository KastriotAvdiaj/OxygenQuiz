using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.Mapping;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    /// <inheritdoc cref="IQuestionDifficultyRepository"/>
    public class QuestionDifficultyRepository : IQuestionDifficultyRepository
    {
        private readonly ApplicationDbContext _context;

        public QuestionDifficultyRepository(ApplicationDbContext context) => _context = context;

        public Task<List<QuestionDifficultyDTO>> GetAllAsync(CancellationToken ct = default) =>
            _context.QuestionDifficulties.AsNoTracking()
                .Select(SecondaryMappers.ProjectDifficulty).ToListAsync(ct);

        public Task<List<QuestionDifficultyAdminDTO>> GetAllForAdminAsync(CancellationToken ct = default) =>
            _context.QuestionDifficulties.AsNoTracking()
                .Select(SecondaryMappers.ProjectDifficultyAdmin).ToListAsync(ct);

        public Task<QuestionDifficultyDTO?> GetByIdAsync(int id, CancellationToken ct = default) =>
            _context.QuestionDifficulties.AsNoTracking()
                .Where(d => d.ID == id)
                .Select(SecondaryMappers.ProjectDifficulty)
                .FirstOrDefaultAsync(ct)!;

        public Task<QuestionDifficulty?> GetTrackedByIdAsync(int id, CancellationToken ct = default) =>
            _context.QuestionDifficulties.FirstOrDefaultAsync(d => d.ID == id, ct);

        public Task<bool> LevelExistsAsync(string level, int? excludeId = null, CancellationToken ct = default)
        {
            var needle = (level ?? string.Empty).Trim().ToLower();
            return _context.QuestionDifficulties.AsNoTracking()
                .AnyAsync(d => d.Level.ToLower() == needle
                               && (excludeId == null || d.ID != excludeId), ct);
        }

        public async Task AddAsync(QuestionDifficulty difficulty, CancellationToken ct = default) =>
            await _context.QuestionDifficulties.AddAsync(difficulty, ct);

        public void Remove(QuestionDifficulty difficulty) =>
            _context.QuestionDifficulties.Remove(difficulty);

        public Task SaveChangesAsync(CancellationToken ct = default) => _context.SaveChangesAsync(ct);
    }

    /// <inheritdoc cref="IQuestionLanguageRepository"/>
    public class QuestionLanguageRepository : IQuestionLanguageRepository
    {
        private readonly ApplicationDbContext _context;

        public QuestionLanguageRepository(ApplicationDbContext context) => _context = context;

        public Task<List<QuestionLanguageDTO>> GetAllAsync(CancellationToken ct = default) =>
            _context.QuestionLanguages.AsNoTracking()
                .Select(SecondaryMappers.ProjectLanguage).ToListAsync(ct);

        public Task<List<QuestionLanguageAdminDTO>> GetAllForAdminAsync(CancellationToken ct = default) =>
            _context.QuestionLanguages.AsNoTracking()
                .Select(SecondaryMappers.ProjectLanguageAdmin).ToListAsync(ct);

        public Task<QuestionLanguageDTO?> GetByIdAsync(int id, CancellationToken ct = default) =>
            _context.QuestionLanguages.AsNoTracking()
                .Where(l => l.Id == id)
                .Select(SecondaryMappers.ProjectLanguage)
                .FirstOrDefaultAsync(ct)!;

        public Task<QuestionLanguage?> GetTrackedByIdAsync(int id, CancellationToken ct = default) =>
            _context.QuestionLanguages.FirstOrDefaultAsync(l => l.Id == id, ct);

        public Task<bool> LanguageExistsAsync(string language, int? excludeId = null, CancellationToken ct = default)
        {
            var needle = (language ?? string.Empty).Trim().ToLower();
            return _context.QuestionLanguages.AsNoTracking()
                .AnyAsync(l => l.Language.ToLower() == needle
                               && (excludeId == null || l.Id != excludeId), ct);
        }

        public async Task AddAsync(QuestionLanguage language, CancellationToken ct = default) =>
            await _context.QuestionLanguages.AddAsync(language, ct);

        public void Remove(QuestionLanguage language) =>
            _context.QuestionLanguages.Remove(language);

        public Task SaveChangesAsync(CancellationToken ct = default) => _context.SaveChangesAsync(ct);
    }
}
