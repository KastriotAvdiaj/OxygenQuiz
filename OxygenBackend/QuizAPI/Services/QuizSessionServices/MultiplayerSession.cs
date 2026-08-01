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

        /// <summary>
        /// When this account first entered the lobby. The chat catch-up is filtered to messages
        /// sent at or after this instant, so a new arrival never reads what was said before they
        /// were in the room.
        ///
        /// Set **once**, on the first join, and deliberately left alone on rejoin — a refresh or a
        /// reconnect is the same person continuing, and re-stamping it would blank the chat they'd
        /// already read. Leaving the lobby drops the participant record entirely, so a genuine
        /// leave-and-come-back does reset the watermark, which is the intent.
        /// </summary>
        public DateTime FirstJoinedAt { get; set; } = DateTime.UtcNow;
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

    /// <summary>
    /// Why a join was refused. Sent to the client as a stable string alongside the human-readable
    /// message so the UI can style/branch on the cause instead of matching on copy.
    /// </summary>
    public static class JoinFailureReason
    {
        public const string NotFound = "not-found";
        public const string Full = "full";
    }

    /// <summary>
    /// A join refused for a reason the player can act on (bad code, full lobby) rather than a
    /// server fault. <c>QuizHub.JoinSession</c> converts this to a <c>HubException</c>, which is
    /// the only exception type SignalR relays verbatim to the client — a plain
    /// <c>InvalidOperationException</c> would reach the browser as "An unexpected error occurred"
    /// and the real cause would be lost.
    /// </summary>
    public sealed class SessionJoinException : Exception
    {
        /// <summary>One of <see cref="JoinFailureReason"/>.</summary>
        public string Reason { get; }

        public SessionJoinException(string reason, string message) : base(message) => Reason = reason;
    }

    /// <summary>
    /// The result of a pre-flight lookup for a room code — what <c>QuizHub.CheckSession</c> returns
    /// so the join dialog can reject a bad code *before* navigating the user to the lobby route.
    /// The same conditions are re-checked inside <c>AddParticipantAsync</c>: this is a courtesy
    /// check, never the enforcement point (a lobby can fill between the check and the join).
    /// </summary>
    public sealed class SessionAvailability
    {
        /// <summary>True when the caller may proceed to the lobby route.</summary>
        public bool CanJoin { get; init; }
        /// <summary>One of <see cref="JoinFailureReason"/>, or null when <see cref="CanJoin"/>.</summary>
        public string? Reason { get; init; }
        /// <summary>Human-readable explanation, null when <see cref="CanJoin"/>.</summary>
        public string? Message { get; init; }
        /// <summary>
        /// True when a match is already running. Informational only — joining mid-match is
        /// permitted (see the late-joiner rule in docs/quiz/multiplayer.md §2), so this never
        /// clears <see cref="CanJoin"/>; the dialog just warns.
        /// </summary>
        public bool InProgress { get; init; }
        public string LobbyName { get; init; } = string.Empty;
        public int ParticipantCount { get; init; }
        public int MaxPlayers { get; init; }
    }
}
