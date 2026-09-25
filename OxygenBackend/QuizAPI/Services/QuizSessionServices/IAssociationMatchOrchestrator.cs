using QuizAPI.DTOs.Quiz;

namespace QuizAPI.Services.QuizSessionServices
{
    /// <summary>
    /// Runs an Associations Duel in a lobby — the Associations counterpart of
    /// <see cref="IMatchOrchestrator"/> (docs/quiz/associations.md §10). Registered as a singleton.
    /// Shares the lobby's <c>MatchCts</c> liveness guard and
    /// <see cref="IMatchOrchestrator.ResetToLobbyAsync"/>, so a lobby has one idea of "a match is
    /// running" and one of "back to the lobby", whichever format it plays.
    /// </summary>
    public interface IAssociationMatchOrchestrator
    {
        /// <summary>
        /// Validates the lobby (an Associations quiz picked, exactly two players) and starts the
        /// Duel loop. Throws <see cref="InvalidOperationException"/> with a sentence for the host.
        /// </summary>
        Task StartMatchAsync(string sessionId);

        // The three moves. Each throws DuelMoveException (a sentence for the player) when refused,
        // and broadcasts DuelUpdated to the room when accepted.
        Task OpenTileAsync(string sessionId, string username, int tileId);
        Task GuessAsync(string sessionId, string username, string target, string text);
        Task PassAsync(string sessionId, string username);

        /// <summary>
        /// A participant left the lobby (explicitly, or the disconnect grace ran out). If they are
        /// seated in a running Duel, they forfeit (D10). Anyone else: nothing.
        /// </summary>
        Task PlayerLeftAsync(string sessionId, string username);

        /// <summary>The running Duel's view, for a player who (re)joins mid-Duel; null when there is none.</summary>
        Task<DuelViewDTO?> CurrentViewAsync(string sessionId);
    }
}
