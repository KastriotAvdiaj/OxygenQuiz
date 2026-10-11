using QuizAPI.DTOs.Quiz;
using QuizAPI.Filtering;

namespace QuizAPI.Repositories.Interfaces
{
    /// <summary>
    /// Reads of played matches. Read-only on purpose: a match is written once, whole, by the
    /// orchestrator that ran it (<c>MatchOrchestrator.PersistMatchAsync</c>), and nothing edits one
    /// afterwards.
    ///
    /// <para><b>Every read takes the caller's id and returns only matches that caller played
    /// in.</b> That is the ownership clamp (CLAUDE.md: "ownership clamps in the repository"), and
    /// it is the same rule the results page already applies to a match: you may read a match you
    /// were in, and every player's answers in it, and nothing about a match you were not in.</para>
    /// </summary>
    public interface IMatchRepository
    {
        /// <summary>The matches of one lobby that <paramref name="userId"/> played in, oldest first.</summary>
        Task<IReadOnlyList<MatchSummaryDto>> ListForLobbyAsync(Guid lobbyId, Guid userId, CancellationToken ct = default);

        /// <summary>
        /// <paramref name="userId"/>'s multiplayer history, one entry per lobby, most recently
        /// played first. A match recorded before lobbies had an id is a lobby of one.
        /// </summary>
        Task<PagedResponse<LobbyHistoryDto>> ListLobbiesForUserAsync(Guid userId, int page, int pageSize, CancellationToken ct = default);
    }
}
