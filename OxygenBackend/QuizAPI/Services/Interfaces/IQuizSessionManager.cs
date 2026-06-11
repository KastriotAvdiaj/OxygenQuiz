using QuizAPI.Services.QuizSessionServices;

namespace QuizAPI.Services.Interfaces;

public interface IQuizSessionManager
{
    Task<Participant> AddParticipantAsync(string sessionId, string username, string connectionId);
    Task RemoveParticipantAsync(string sessionId, string username);
    Task<List<Participant>> GetParticipantsAsync(string sessionId);
    Task SetPlayerReadyAsync(string sessionId, string username, bool isReady);
    Task<string?> GetHostUsernameAsync(string sessionId);
    Task<bool> IsHostAsync(string sessionId, string username);
    
    // New methods for lobby redesign
    Task<MultiplayerSession> CreateSessionAsync(string sessionId, string lobbyName, int maxPlayers, string hostUsername, string connectionId);
    Task SetQuizAsync(string sessionId, string quizId);
    Task<MultiplayerSession?> GetSessionAsync(string sessionId);

    // Ephemeral lobby chat (in-memory, capped buffer).
    Task<LobbyChatMessage> AddChatMessageAsync(string sessionId, string username, string text, bool isSystem = false);
    Task<IReadOnlyList<LobbyChatMessage>> GetRecentMessagesAsync(string sessionId);
}
