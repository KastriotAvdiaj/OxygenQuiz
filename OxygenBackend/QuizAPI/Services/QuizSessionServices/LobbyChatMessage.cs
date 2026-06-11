namespace QuizAPI.Services.QuizSessionServices
{
    /// <summary>
    /// A single lobby chat line. Ephemeral and in-memory only (Phase 1): messages live in the
    /// session's capped recent buffer and are gone when the session ends. Not the MongoDB
    /// <c>ChatApp.Models.ChatMessage</c> — that's for the separate persistent chat system.
    /// </summary>
    public sealed class LobbyChatMessage
    {
        public string Username { get; init; } = string.Empty;
        public string Text { get; init; } = string.Empty;
        public DateTime SentUtc { get; init; } = DateTime.UtcNow;
        /// <summary>True for server notices like "Alice joined" rather than a user message.</summary>
        public bool IsSystem { get; init; }
    }
}
