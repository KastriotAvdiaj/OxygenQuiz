using QuizAPI.Models.Associations;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Repositories.Interfaces
{
    /// <summary>
    /// Data access for Associations play: the games, their players and moves, and the
    /// <see cref="QuizSession"/> rows they hang off. See docs/quiz/associations.md, "Playing".
    ///
    /// <para>Reads that the caller will change are <b>tracked</b>, and <see cref="SaveChangesAsync"/>
    /// writes the move, the session's score and any ending together — one save, so a move can
    /// never be recorded without its effect on the session, or the other way round.</para>
    /// </summary>
    public interface IAssociationGameRepository
    {
        /// <summary>A quiz that isn't soft-deleted, untracked. Visibility is the caller's check (ADR 0019).</summary>
        Task<Quiz?> GetQuizAsync(int quizId, CancellationToken ct = default);

        /// <summary>A session with its quiz, tracked.</summary>
        Task<QuizSession?> GetSessionAsync(Guid sessionId, CancellationToken ct = default);

        /// <summary>
        /// The game a session plays, tracked, with its players, its moves and its Board's content —
        /// everything replay needs. Null for a session that isn't an Associations one.
        /// </summary>
        Task<AssociationGame?> GetGameForSessionAsync(Guid sessionId, CancellationToken ct = default);

        /// <summary>This user's unfinished single-player session of this quiz, tracked, if any.</summary>
        Task<QuizSession?> GetUnfinishedSoloSessionAsync(Guid userId, int quizId, CancellationToken ct = default);

        /// <summary>The Solo deadline of the game each session plays. Sessions without a game are absent.</summary>
        Task<Dictionary<Guid, DateTime?>> GetDeadlinesAsync(IReadOnlyCollection<Guid> sessionIds, CancellationToken ct = default);

        void AddSession(QuizSession session);
        void AddGame(AssociationGame game);
        void AddMove(AssociationGameMove move);

        /// <summary>
        /// Ends every still-running game played by these sessions and saves: <c>TimeUp</c> if its
        /// deadline had passed at <paramref name="at"/>, otherwise <c>Abandoned</c>. For the
        /// abandonment paths, which end sessions in bulk. Returns how many games it ended.
        /// </summary>
        Task<int> EndGamesOfSessionsAsync(IReadOnlyCollection<Guid> sessionIds, DateTime at, CancellationToken ct = default);

        /// <summary>
        /// Clears these sessions out of their games so the sessions can be deleted, and saves. A
        /// <b>Solo</b> game is deleted whole — game, player, moves: it has no one else in it. A
        /// <b>Duel</b> game only loses that session's player row, because it is also the other
        /// player's record. Call it <i>before</i> deleting the sessions: <c>AssociationGamePlayer</c>
        /// restricts a session's deletion precisely so this step can't be forgotten. Returns how many
        /// games were deleted.
        /// </summary>
        Task<int> DeleteGamesOfSessionsAsync(IReadOnlyCollection<Guid> sessionIds, CancellationToken ct = default);

        Task SaveChangesAsync(CancellationToken ct = default);
    }
}
