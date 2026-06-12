using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace QuizAPI.MongoDB.Models
{
    /// <summary>
    /// A persisted multiplayer lobby chat line. This is a write-only retention record kept for the
    /// system (audit / moderation); it is never read back into the app or shown to users again.
    /// Distinct from the richer ChatApp.Models chat system. Stored in the "lobbyChatMessages"
    /// collection, one document per message.
    /// </summary>
    public sealed class LobbyChatLog
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        /// <summary>The multiplayer session (lobby) the message belonged to.</summary>
        [BsonElement("sessionId")]
        public string SessionId { get; set; } = string.Empty;

        /// <summary>Sender's username, or the system actor for notices.</summary>
        [BsonElement("username")]
        public string Username { get; set; } = string.Empty;

        [BsonElement("text")]
        public string Text { get; set; } = string.Empty;

        /// <summary>When the message was sent (mirrors the in-memory message).</summary>
        [BsonElement("sentUtc")]
        public DateTime SentUtc { get; set; }

        /// <summary>True for server notices like "Alice joined" rather than a user message.</summary>
        [BsonElement("isSystem")]
        public bool IsSystem { get; set; }

        /// <summary>When this record was written to MongoDB.</summary>
        [BsonElement("archivedAt")]
        public DateTime ArchivedAt { get; set; } = DateTime.UtcNow;
    }
}
