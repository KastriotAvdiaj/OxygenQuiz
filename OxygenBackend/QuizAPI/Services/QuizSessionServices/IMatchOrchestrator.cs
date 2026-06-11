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
    }
}
