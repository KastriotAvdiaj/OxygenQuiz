using QuizAPI.Models.Associations;

namespace QuizAPI.Repositories.Interfaces
{
    /// <summary>
    /// Data access for Associations Boards. Nothing outside a repository touches DbContext
    /// (CLAUDE.md). Saving is the shared unit of work — callers save through
    /// <see cref="IQuizRepository.SaveChangesAsync"/>, which is the same context, so a quiz and
    /// its Board are written in one SaveChanges.
    /// </summary>
    public interface IAssociationBoardRepository
    {
        /// <summary>The quiz's current Board with its Columns and Tiles, or null. Tracked when <paramref name="track"/>.</summary>
        Task<AssociationBoard?> GetLiveAsync(int quizId, bool track = false, CancellationToken ct = default);

        /// <summary>The Board a game pinned to <paramref name="quizVersion"/> plays, or null.</summary>
        Task<AssociationBoard?> GetForVersionAsync(int quizId, int quizVersion, CancellationToken ct = default);

        Task AddAsync(AssociationBoard board, CancellationToken ct = default);
    }
}
