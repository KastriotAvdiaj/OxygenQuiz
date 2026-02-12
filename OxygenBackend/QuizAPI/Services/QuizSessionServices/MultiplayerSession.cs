using System.Collections.Concurrent;
using System.Collections.Generic;

namespace QuizAPI.Services.QuizSessionServices
{
    public class MultiplayerSession
    {
        public string SessionId { get; set; } = string.Empty;
        public string LobbyName { get; set; } = "Quiz Lobby";
        public int MaxPlayers { get; set; } = 4;
        public string? SelectedQuizId { get; set; } // Nullable - can be set later by host
        public string HostUsername { get; set; } = string.Empty;
        public List<Participant> Participants { get; set; } = new();
        public QuizState QuizState { get; set; } = QuizState.Lobby;
        public int CurrentQuestionIndex { get; set; } = 0;
        public DateTime QuestionStartTime { get; set; }
        public ConcurrentDictionary<string, int> PlayerScores { get; set; } = new();
        public ConcurrentDictionary<string, string> PlayerAnswers { get; set; } = new();
    }

    public class Participant
    {
        public string Username { get; set; } = string.Empty;
        public bool IsReady { get; set; } = false;
        public bool IsHost { get; set; } = false;
        public string ConnectionId { get; set; } = string.Empty;
    }

    public enum QuizState
    {
        Lobby,
        Starting,
        InProgress,
        QuestionActive,
        QuestionEnded,
        QuizEnded
    }
}
