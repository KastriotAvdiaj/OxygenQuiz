using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models.Associations;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class AssociationBoardRepository : IAssociationBoardRepository
    {
        private readonly ApplicationDbContext _context;

        public AssociationBoardRepository(ApplicationDbContext context) => _context = context;

        private IQueryable<AssociationBoard> WithContent(bool track)
        {
            var boards = _context.AssociationBoards.Include(b => b.Columns).ThenInclude(c => c.Tiles);
            return track ? boards : boards.AsNoTracking();
        }

        public Task<AssociationBoard?> GetLiveAsync(int quizId, bool track = false, CancellationToken ct = default) =>
            WithContent(track).FirstOrDefaultAsync(b => b.QuizId == quizId && b.RemovedInVersion == null, ct);

        public Task<AssociationBoard?> GetForVersionAsync(int quizId, int quizVersion, CancellationToken ct = default) =>
            // Inline form of AssociationBoard.IsVisibleToVersion — a method call can't be translated to SQL.
            WithContent(track: false).FirstOrDefaultAsync(b =>
                b.QuizId == quizId
                && b.CreatedInVersion <= quizVersion
                && (b.RemovedInVersion == null || b.RemovedInVersion > quizVersion), ct);

        public async Task AddAsync(AssociationBoard board, CancellationToken ct = default) =>
            await _context.AssociationBoards.AddAsync(board, ct);
    }
}
