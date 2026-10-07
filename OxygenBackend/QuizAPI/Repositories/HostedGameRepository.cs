using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models.Associations;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Associations;

namespace QuizAPI.Repositories
{
    public class HostedGameRepository : IHostedGameRepository
    {
        private readonly ApplicationDbContext _context;

        public HostedGameRepository(ApplicationDbContext context) => _context = context;

        private IQueryable<AssociationGame> Full() =>
            _context.AssociationGames
                .Where(g => g.PlayStyle == PlayStyle.Hosted)
                .Include(g => g.Teams)
                .Include(g => g.Moves)
                .Include(g => g.Board).ThenInclude(b => b.Columns).ThenInclude(c => c.Tiles)
                .AsSplitQuery();

        public Task<Quiz?> GetQuizAsync(int quizId, CancellationToken ct = default) =>
            _context.Quizzes.AsNoTracking().FirstOrDefaultAsync(q => q.Id == quizId, ct);

        public Task<AssociationGame?> GetAsync(Guid id, Guid hostId, CancellationToken ct = default) =>
            Full().FirstOrDefaultAsync(g => g.Id == id && g.HostUserId == hostId, ct);

        public Task<AssociationGame?> GetByScreenCodeAsync(string code, CancellationToken ct = default) =>
            Full().FirstOrDefaultAsync(g => g.ScreenCode == code, ct);

        public Task<AssociationGame?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
            Full().FirstOrDefaultAsync(g => g.Id == id, ct);

        public Task<bool> ScreenCodeExistsAsync(string code, CancellationToken ct = default) =>
            _context.AssociationGames.AnyAsync(g => g.ScreenCode == code, ct);

        public async Task<IReadOnlyList<AssociationGame>> ListForHostAsync(Guid hostId, CancellationToken ct = default) =>
            await Full().Where(g => g.HostUserId == hostId).OrderByDescending(g => g.StartedAt).ToListAsync(ct);

        public async Task<IReadOnlyList<AssociationGame>> GetIdleAsync(DateTime before, CancellationToken ct = default) =>
            await Full().Where(g => g.EndReason == null && g.LastActivityAt < before).ToListAsync(ct);

        public Task<Dictionary<int, string>> GetQuizTitlesAsync(IReadOnlyCollection<int> quizIds, CancellationToken ct = default) =>
            _context.Quizzes.AsNoTracking().IgnoreQueryFilters()
                .Where(q => quizIds.Contains(q.Id))
                .ToDictionaryAsync(q => q.Id, q => q.Title, ct);

        public void AddGame(AssociationGame game) => _context.AssociationGames.Add(game);
        public void AddMove(AssociationGameMove move) => _context.AssociationGameMoves.Add(move);
        public Task<int> SaveChangesAsync(CancellationToken ct = default) => _context.SaveChangesAsync(ct);
    }
}
