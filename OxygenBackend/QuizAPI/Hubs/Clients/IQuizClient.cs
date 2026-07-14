using QuizAPI.Services.QuizSessionServices;

namespace QuizAPI.Hubs.Clients;

public interface IQuizClient
{
    // UserJoined: username, isFirstUser (Host), profileImageUrl (null when the account has no avatar)
    Task UserJoined(string username, bool isFirstUser, string? profileImageUrl);
    Task UserLeft(string username);
    Task AnswerSubmitted(string username);
    // Provide full participant info
    Task CurrentParticipants(List<Participant> participants);
    Task PlayerReadyChanged(string username, bool isReady);
    Task GameStarted(string quizId);
    Task HostChanged(string newHostUsername);
    
    // New events for lobby redesign
    Task QuizSelected(string quizId, string quizTitle);
    Task LobbySettingsChanged(string lobbyName, int maxPlayers);

    // ── Live match events (server-driven; see MatchOrchestrator) ──
    Task MatchStarting(int countdownSeconds);
    Task QuestionStarted(RoundQuestionView question, DateTime deadlineUtc);
    Task QuestionEnded(QuestionResult result);
    Task MatchEnded(MatchResult result);

    // ── Lobby chat (ephemeral) ──
    Task ChatMessageReceived(LobbyChatMessage message);
    Task ChatHistory(IReadOnlyList<LobbyChatMessage> messages);
}
