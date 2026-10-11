using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Filtering;
using QuizAPI.Mapping;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class MatchRepository : IMatchRepository
    {
        /// <summary>A history page of lobbies is small on purpose: each one expands into its matches.</summary>
        private const int MaxPageSize = 50;

        private readonly ApplicationDbContext _context;

        public MatchRepository(ApplicationDbContext context) => _context = context;

        // A ternary, not ToString(): this runs in SQL (CLAUDE.md, "Read projections are translated").
        private static readonly Expression<Func<Match, MatchSummaryDto>> ProjectSummary = m => new MatchSummaryDto
        {
            MatchId = m.Id,
            LobbyKey = m.LobbyId ?? m.Id,
            RoomCode = m.RoomCode,
            QuizId = m.QuizId,
            QuizTitle = m.Quiz.Title,
            Format = m.Quiz.Format == QuizFormat.Associations
                ? QuizMappers.FormatNames.Associations
                : QuizMappers.FormatNames.Classic,
            StartedAt = m.StartedAt,
            EndedAt = m.EndedAt,
            Players = m.Sessions
                .OrderByDescending(s => s.TotalScore)
                .Select(s => new MatchSummaryPlayerDto
                {
                    SessionId = s.Id,
                    UserId = s.UserId,
                    Username = s.User.Username,
                    ProfileImageUrl = s.User.ProfileImageUrl,
                    TotalScore = s.TotalScore,
                    IsWinner = m.WinnerUserId != null && s.UserId == m.WinnerUserId,
                })
                .ToList(),
        };

        /// <summary>
        /// The matches <paramref name="userId"/> played in, and whose quiz still exists.
        ///
        /// <para>The second condition is spelled out rather than left to the projection's join.
        /// <c>Quiz</c> is soft-deleted through a query filter, so a match of a deleted quiz drops
        /// out of anything that reads <c>m.Quiz</c> — but the lobby query below counts and pages
        /// groups <i>without</i> reading it, and would otherwise hand back a lobby with no matches
        /// in it. History already hides a deleted quiz's plays (docs/quiz/user-stats-history.md);
        /// this keeps the two queries agreeing about which matches those are.</para>
        /// </summary>
        private IQueryable<Match> PlayedBy(Guid userId) =>
            _context.Matches.AsNoTracking()
                .Where(m => m.Sessions.Any(s => s.UserId == userId))
                .Where(m => _context.Quizzes.Any(q => q.Id == m.QuizId));

        public async Task<IReadOnlyList<MatchSummaryDto>> ListForLobbyAsync(Guid lobbyId, Guid userId, CancellationToken ct = default) =>
            await PlayedBy(userId)
                .Where(m => m.LobbyId == lobbyId)
                .OrderBy(m => m.StartedAt)
                .Select(ProjectSummary)
                .ToListAsync(ct);

        public async Task<PagedResponse<LobbyHistoryDto>> ListLobbiesForUserAsync(Guid userId, int page, int pageSize, CancellationToken ct = default)
        {
            if (page < 1) page = 1;
            pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

            // Paged by lobby, not by match: twenty rows are twenty lobbies however many rematches
            // each one held. The key ties with a stable second sort so pages never skip or repeat.
            var lobbies = PlayedBy(userId)
                .GroupBy(m => m.LobbyId ?? m.Id)
                .Select(g => new { Key = g.Key, LastPlayedAt = g.Max(m => m.StartedAt) });

            var total = await lobbies.CountAsync(ct);
            var keys = await lobbies
                .OrderByDescending(l => l.LastPlayedAt).ThenBy(l => l.Key)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(l => l.Key)
                .ToListAsync(ct);

            var matches = await PlayedBy(userId)
                .Where(m => keys.Contains(m.LobbyId ?? m.Id))
                .OrderBy(m => m.StartedAt)
                .Select(ProjectSummary)
                .ToListAsync(ct);

            var byLobby = matches.ToLookup(m => m.LobbyKey);
            var items = keys
                .Where(byLobby.Contains)
                .Select(key =>
                {
                    var played = byLobby[key].ToList();
                    return new LobbyHistoryDto
                    {
                        LobbyKey = key,
                        // One lobby, one code — but an old match is its own lobby, so take it from the row.
                        RoomCode = played[0].RoomCode,
                        StartedAt = played[0].StartedAt,
                        LastPlayedAt = played[^1].StartedAt,
                        Matches = played,
                    };
                })
                .ToList();

            return new PagedResponse<LobbyHistoryDto>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalItems = total,
            };
        }
    }
}
