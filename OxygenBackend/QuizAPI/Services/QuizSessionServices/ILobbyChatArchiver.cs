using MongoDB.Driver;
using QuizAPI.MongoDB.Models;

namespace QuizAPI.Services.QuizSessionServices
{
    /// <summary>
    /// Persists multiplayer lobby chat lines to MongoDB for system retention (audit / moderation).
    /// Write-only: nothing in the app reads these back. Archiving is best-effort and must never
    /// affect live chat, so the implementation is fire-and-forget and swallows (logs) failures.
    /// </summary>
    public interface ILobbyChatArchiver
    {
        /// <summary>
        /// Queues a lobby line to be written to MongoDB in the background. Returns immediately and
        /// never throws — a MongoDB outage can never surface to users or fault the caller.
        /// </summary>
        void Archive(string sessionId, LobbyChatMessage message);
    }

    /// <inheritdoc />
    public sealed class LobbyChatArchiver : ILobbyChatArchiver
    {
        private const string CollectionName = "lobbyChatMessages";

        private readonly IMongoCollection<LobbyChatLog> _collection;
        private readonly ILogger<LobbyChatArchiver> _logger;

        public LobbyChatArchiver(
            IMongoClient client,
            IConfiguration configuration,
            ILogger<LobbyChatArchiver> logger)
        {
            _logger = logger;

            // The Mongo connection string carries no database, so the name is configured separately
            // (MongoDB:DatabaseName), defaulting to the same logical name as the SQL database.
            var databaseName = configuration["MongoDB:DatabaseName"] ?? "OxygenQuiz";
            _collection = client.GetDatabase(databaseName).GetCollection<LobbyChatLog>(CollectionName);
        }

        public void Archive(string sessionId, LobbyChatMessage message)
        {
            var document = new LobbyChatLog
            {
                SessionId = sessionId,
                Username = message.Username,
                Text = message.Text,
                SentUtc = message.SentUtc,
                IsSystem = message.IsSystem,
            };

            // Fire-and-forget: don't block the hub broadcast on a Mongo round-trip, and make sure a
            // slow/down Mongo can never fault the calling task or reach the user.
            _ = Task.Run(async () =>
            {
                try
                {
                    await _collection.InsertOneAsync(document);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex, "Failed to archive lobby chat message for session {SessionId}", sessionId);
                }
            });
        }
    }

    /// <summary>
    /// No-op archiver used when MongoDB is not deployed. Lobby chat is ephemeral by design, so we
    /// simply discard the retention copy. Satisfies <see cref="ILobbyChatArchiver"/> for the session
    /// manager without requiring an <c>IMongoClient</c>. Swap back to <see cref="LobbyChatArchiver"/>
    /// (and re-enable the Mongo registration in Program.cs) if chat retention is ever needed.
    /// </summary>
    public sealed class NoOpLobbyChatArchiver : ILobbyChatArchiver
    {
        public void Archive(string sessionId, LobbyChatMessage message)
        {
            // Intentionally empty — chat is not persisted in this deployment.
        }
    }
}
