using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models.Associations;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Associations;

namespace QuizAPI.Repositories
{
    public class AssociationGameRepository : IAssociationGameRepository
    {
        private readonly ApplicationDbContext _context;

        public AssociationGameRepository(ApplicationDbContext context) => _context = context;

        public Task<Quiz?> GetQuizAsync(int quizId, CancellationToken ct = default) =>
            // The soft-delete filter is Quiz's only query filter (ADR 0019), so this excludes deleted
            // quizzes and nothing else.
            _context.Quizzes.AsNoTracking().FirstOrDefaultAsync(q => q.Id == quizId, ct);

        public Task<QuizSession?> GetSessionAsync(Guid sessionId, CancellationToken ct = default) =>
            _context.QuizSessions.Include(s => s.Quiz).FirstOrDefaultAsync(s => s.Id == sessionId, ct);

        public Task<AssociationGame?> GetGameForSessionAsync(Guid sessionId, CancellationToken ct = default) =>
            _context.AssociationGames
                .Include(g => g.Players)
                .Include(g => g.Moves)
                .Include(g => g.Board).ThenInclude(b => b.Columns).ThenInclude(c => c.Tiles)
                .AsSplitQuery()
                .FirstOrDefaultAsync(g => g.Players.Any(p => p.SessionId == sessionId), ct);

        public Task<QuizSession?> GetUnfinishedSoloSessionAsync(Guid userId, int quizId, CancellationToken ct = default) =>
            _context.QuizSessions
                .Include(s => s.Quiz)
                .Where(s => s.UserId == userId && s.QuizId == quizId && !s.IsCompleted
                         && s.Mode == QuizSessionMode.SinglePlayer && !s.IsGuestSession)
                // Only sessions that are Associations games: a Classic session of the same quiz
                // can't exist (Classic refuses the format), but this must not depend on that.
                .Where(s => _context.AssociationGamePlayers.Any(p => p.SessionId == s.Id))
                .OrderByDescending(s => s.StartTime)
                .FirstOrDefaultAsync(ct);

        public async Task<Dictionary<Guid, DateTime?>> GetDeadlinesAsync(IReadOnlyCollection<Guid> sessionIds, CancellationToken ct = default)
        {
            if (sessionIds.Count == 0) return new Dictionary<Guid, DateTime?>();
            var rows = await _context.AssociationGamePlayers.AsNoTracking()
                .Where(p => sessionIds.Contains(p.SessionId))
                .Select(p => new { p.SessionId, p.Game.DeadlineUtc })
                .ToListAsync(ct);
            return rows.ToDictionary(r => r.SessionId, r => r.DeadlineUtc);
        }

        public void AddSession(QuizSession session) => _context.QuizSessions.Add(session);
        public void AddGame(AssociationGame game) => _context.AssociationGames.Add(game);
        public void AddMove(AssociationGameMove move) => _context.AssociationGameMoves.Add(move);

        public async Task<int> EndGamesOfSessionsAsync(IReadOnlyCollection<Guid> sessionIds, DateTime at, CancellationToken ct = default)
        {
            if (sessionIds.Count == 0) return 0;
            var games = await _context.AssociationGames
                .Where(g => g.EndedAt == null && g.Players.Any(p => sessionIds.Contains(p.SessionId)))
                .ToListAsync(ct);

            foreach (var game in games)
            {
                var timedOut = game.DeadlineUtc is DateTime deadline && at >= deadline;
                game.EndReason = timedOut ? GameEndReason.TimeUp : GameEndReason.Abandoned;
                // A game that ran out of time ended at its deadline, not when the sweep noticed.
                game.EndedAt = timedOut ? game.DeadlineUtc : at;
            }

            await _context.SaveChangesAsync(ct);
            return games.Count;
        }

        public async Task<int> DeleteGamesOfSessionsAsync(IReadOnlyCollection<Guid> sessionIds, CancellationToken ct = default)
        {
            if (sessionIds.Count == 0) return 0;

            var players = await _context.AssociationGamePlayers
                .Include(p => p.Game)
                .Where(p => sessionIds.Contains(p.SessionId))
                .ToListAsync(ct);

            var soloGameIds = players.Where(p => p.Game.PlayStyle == PlayStyle.Solo).Select(p => p.GameId).Distinct().ToList();
            var soloGames = await _context.AssociationGames
                .Include(g => g.Players)
                .Include(g => g.Moves)
                .Where(g => soloGameIds.Contains(g.Id))
                .ToListAsync(ct);

            // Moves and players are loaded, so the cascade is applied by EF itself as well as by the
            // database — the same result on the InMemory provider the tests use.
            _context.AssociationGames.RemoveRange(soloGames);
            _context.AssociationGamePlayers.RemoveRange(players.Where(p => p.Game.PlayStyle != PlayStyle.Solo));

            await _context.SaveChangesAsync(ct);
            return soloGames.Count;
        }

        public Task SaveChangesAsync(CancellationToken ct = default) => _context.SaveChangesAsync(ct);
    }
}
