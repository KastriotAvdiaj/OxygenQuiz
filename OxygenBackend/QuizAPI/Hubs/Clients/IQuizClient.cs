using QuizAPI.DTOs.Quiz;
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
    Task HostChanged(string newHostUsername);
    
    // New events for lobby redesign
    Task QuizSelected(SelectedQuizView quiz);
    Task LobbySettingsChanged(string lobbyName, int maxPlayers);

    // ── Live match events (server-driven; see MatchOrchestrator) ──
    Task MatchStarting(int countdownSeconds);
    Task QuestionStarted(RoundQuestionView question, DateTime deadlineUtc);
    Task QuestionEnded(QuestionResult result);
    Task MatchEnded(MatchResult result);

    // The match that just ended is now in the database, and so is its review. Its own event
    // because MatchEnded goes out first, on purpose — players see their results before the write,
    // and a failed write must not hold them up — so at MatchEnded there is nothing to read yet.
    // No payload: it only tells the lobby to ask for its matches again (GET /api/matches/lobby/…).
    Task MatchRecorded();

    // ── Associations Duel (server-driven; see AssociationMatchOrchestrator) ──
    // Own names, never a Classic one: connection.off(name) on the client removes every handler for
    // that name, so the Duel's hook and useMatch must not share an event (multiplayer.md §1).
    Task DuelStarting(int countdownSeconds);
    Task DuelStarted(DuelViewDTO view);
    /// <summary>A move was made (or the turn clock ran out, or someone forfeited).</summary>
    Task DuelUpdated(DuelUpdateDTO update);
    /// <summary>The Duel is over and recorded; the view carries each player's results link.</summary>
    Task DuelEnded(DuelViewDTO view);
    /// <summary>Catch-up for a player who (re)joins while a Duel is on — sent to that caller only.</summary>
    Task DuelState(DuelViewDTO view);

    // ── Lobby chat (ephemeral) ──
    Task ChatMessageReceived(LobbyChatMessage message);
    Task ChatHistory(IReadOnlyList<LobbyChatMessage> messages);
}
