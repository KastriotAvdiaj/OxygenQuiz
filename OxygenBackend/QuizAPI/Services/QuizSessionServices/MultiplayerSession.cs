using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;

namespace QuizAPI.Services.QuizSessionServices
{
    public class MultiplayerSession
    {
        public string SessionId { get; set; } = string.Empty;
        public string LobbyName { get; set; } = "Quiz Lobby";
        public int MaxPlayers { get; set; } = 4;
        /// <summary>
        /// The host's current pick, or null until one is made. Held in full (not just the id) so
        /// a player joining after the host chose can be replayed the same QuizSelected payload
        /// everyone else already received.
        /// </summary>
        public SelectedQuizView? SelectedQuiz { get; set; }

        /// <summary>Convenience accessor for the id alone — what the match loop needs.</summary>
        public string? SelectedQuizId => SelectedQuiz?.Id;
        public string HostUsername { get; set; } = string.Empty;
        public List<Participant> Participants { get; set; } = new();
        public QuizState QuizState { get; set; } = QuizState.Lobby;
        public int CurrentQuestionIndex { get; set; } = 0;
        public DateTime QuestionStartTime { get; set; }
        public ConcurrentDictionary<string, int> PlayerScores { get; set; } = new();
        public ConcurrentDictionary<string, string> PlayerAnswers { get; set; } = new();

        // ── Live-match runtime state (populated when a match starts; see MatchOrchestrator) ──
        /// <summary>The quiz's questions for this match, loaded once at start.</summary>
        public List<RoundQuestion> Questions { get; set; } = new();
        /// <summary>When the current question stops accepting answers.</summary>
        public DateTime QuestionDeadlineUtc { get; set; }
        /// <summary>This round's submissions, keyed by username. Cleared each question.</summary>
        public ConcurrentDictionary<string, RoundAnswer> CurrentRoundAnswers { get; set; } = new();
        /// <summary>Running count of correct answers per player (for standings/tiebreak).</summary>
        public ConcurrentDictionary<string, int> PlayerCorrect { get; set; } = new();
        /// <summary>Cancels the match loop if the lobby is torn down mid-game.</summary>
        public CancellationTokenSource? MatchCts { get; set; }

        /// <summary>Ephemeral lobby chat — a capped buffer of recent messages (in-memory only).</summary>
        public List<LobbyChatMessage> RecentMessages { get; set; } = new();
    }

    public class Participant
    {
        public string Username { get; set; } = string.Empty;
        public bool IsReady { get; set; } = false;
        public bool IsHost { get; set; } = false;
        public string ConnectionId { get; set; } = string.Empty;
        /// <summary>The account's avatar at join time; null when the user has none.</summary>
        public string? ProfileImageUrl { get; set; }
    }

    /// <summary>
    /// The host's quiz pick, as broadcast to the lobby. Only <see cref="Id"/> is authoritative —
    /// it's validated against <c>IQuizService.CanHostQuizAsync</c> in <c>QuizHub.SelectQuiz</c>
    /// before anything is stored or sent. The remaining fields are display labels echoed from the
    /// host's picker so guests can render the selection without each re-fetching the quiz.
    /// </summary>
    public sealed class SelectedQuizView
    {
        public string Id { get; init; } = string.Empty;
        public string Title { get; init; } = string.Empty;
        public string? Category { get; init; }
        public string? Difficulty { get; init; }
        public int? QuestionCount { get; init; }
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
