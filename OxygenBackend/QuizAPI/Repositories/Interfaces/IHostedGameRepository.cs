using QuizAPI.Models.Associations;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Repositories.Interfaces
{
    /// <summary>
    /// Hosted games (docs/quiz/classroom.md). Reads by id are clamped to the host — another
    /// Teacher's game is simply not found.
    /// </summary>
    public interface IHostedGameRepository
    {
        Task<Quiz?> GetQuizAsync(int quizId, CancellationToken ct = default);
        /// <summary>The game with its Board, Teams and moves, tracked.</summary>
        Task<AssociationGame?> GetAsync(Guid id, Guid hostId, CancellationToken ct = default);
        Task<AssociationGame?> GetByScreenCodeAsync(string code, CancellationToken ct = default);
        /// <summary>Any hosted game, by id — for the hub, which has authorised the caller already.</summary>
        Task<AssociationGame?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<bool> ScreenCodeExistsAsync(string code, CancellationToken ct = default);
        Task<IReadOnlyList<AssociationGame>> ListForHostAsync(Guid hostId, CancellationToken ct = default);
        /// <summary>Unfinished hosted games with no activity since <paramref name="before"/>.</summary>
        Task<IReadOnlyList<AssociationGame>> GetIdleAsync(DateTime before, CancellationToken ct = default);
        Task<Dictionary<int, string>> GetQuizTitlesAsync(IReadOnlyCollection<int> quizIds, CancellationToken ct = default);
        void AddGame(AssociationGame game);
        void AddMove(AssociationGameMove move);
        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
