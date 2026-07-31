namespace QuizAPI.Services.QuizSessionServices
{
    /// <summary>
    /// Drives a live multiplayer match server-side: loads the selected quiz's questions, then runs
    /// the question-by-question loop (broadcast question → collect answers → grade → reveal →
    /// advance) and finally announces the winner. Registered as a singleton; it owns the running
    /// loops and broadcasts through <c>IHubContext&lt;QuizHub, IQuizClient&gt;</c>.
    /// </summary>
    public interface IMatchOrchestrator
    {
        /// <summary>
        /// Validates the session is ready (quiz selected, enough players) and kicks off the match
        /// loop on a background task. Returns once the match has started; throws
        /// <see cref="System.InvalidOperationException"/> if it can't begin.
        /// </summary>
        Task StartMatchAsync(string sessionId);

        /// <summary>
        /// Returns a session to <see cref="QuizState.Lobby"/> and drops the finished match's
        /// runtime state (questions, scores, round answers) so the host can start another match
        /// in the same lobby. Also un-readies every participant, so a rematch needs a fresh
        /// opt-in from each player rather than launching the moment the scoreboard appears.
        ///
        /// Called by the match loop itself when it stops — for any reason, including a crash or
        /// cancellation — so a lobby is never stranded in a non-startable state. Safe to call on
        /// a missing session, and a no-op while a match loop is still running.
        /// </summary>
        Task ResetToLobbyAsync(string sessionId);
    }
}
