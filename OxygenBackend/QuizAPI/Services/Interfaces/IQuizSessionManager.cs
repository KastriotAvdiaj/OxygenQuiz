using QuizAPI.Services.QuizSessionServices;

namespace QuizAPI.Services.Interfaces;

public interface IQuizSessionManager
{
    Task<Participant> AddParticipantAsync(string sessionId, string username, string connectionId, string? profileImageUrl = null);
    /// <summary>Non-mutating pre-flight check for a room code, used by the join dialog.</summary>
    Task<SessionAvailability> CheckSessionAsync(string sessionId, string username);
    Task RemoveParticipantAsync(string sessionId, string username);
    Task<List<Participant>> GetParticipantsAsync(string sessionId);
    Task SetPlayerReadyAsync(string sessionId, string username, bool isReady);
    Task<string?> GetHostUsernameAsync(string sessionId);
    Task<bool> IsHostAsync(string sessionId, string username);
    
    // New methods for lobby redesign
    Task<MultiplayerSession> CreateSessionAsync(string sessionId, string lobbyName, int maxPlayers, string hostUsername, string connectionId, string? hostProfileImageUrl = null);
    Task SetQuizAsync(string sessionId, SelectedQuizView quiz);
    Task<MultiplayerSession?> GetSessionAsync(string sessionId);

    // Ephemeral lobby chat (in-memory, capped buffer).
    Task<LobbyChatMessage> AddChatMessageAsync(string sessionId, string username, string text, bool isSystem = false);

    /// <summary>
    /// The chat catch-up for one participant: only messages sent at or after their
    /// <see cref="Participant.FirstJoinedAt"/>. A new arrival gets nothing that was said before
    /// they were in the room; a reconnecting participant gets back what they had. Returns empty
    /// for an unknown session or a caller who isn't on the roster.
    /// </summary>
    Task<IReadOnlyList<LobbyChatMessage>> GetMessagesSinceJoinAsync(string sessionId, string username);
}
