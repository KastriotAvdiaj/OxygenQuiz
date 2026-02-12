using QuizAPI.Services.QuizSessionServices;

namespace QuizAPI.Hubs.Clients;

public interface IQuizClient
{
    // UserJoined: username, isFirstUser (Host)
    Task UserJoined(string username, bool isFirstUser); 
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
}
