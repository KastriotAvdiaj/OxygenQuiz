using QuizAPI.DTOs.Quiz;

namespace QuizAPI.DTOs.Classroom
{
    public class HostedTeamInput
    {
        public string Name { get; set; } = string.Empty;
        /// <summary>"red", "blue", "green" or "yellow"; defaults by position when absent.</summary>
        public string? Colour { get; set; }
        public List<string> Students { get; set; } = new();
    }

    public class StartHostedGameRequest
    {
        public int QuizId { get; set; }
        public string? ShareToken { get; set; }
        /// <summary>2–4 Teams, in Seat order.</summary>
        public List<HostedTeamInput> Teams { get; set; } = new();
        /// <summary>Null for "No time limit" — then <see cref="TurnSeconds"/> must be null too.</summary>
        public int? GameSeconds { get; set; }
        public int? TurnSeconds { get; set; }
    }

    public class PlayHostedGameAgainRequest
    {
        /// <summary>Another Board to play with the same Teams; null for the same one.</summary>
        public int? QuizId { get; set; }
        public string? ShareToken { get; set; }
    }

    public class HostedGuessRequest
    {
        public string Target { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
    }

    public class HostedOpenRequest
    {
        public int TileId { get; set; }
    }

    public class HostedTeamDTO
    {
        public int Seat { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Colour { get; set; } = string.Empty;
        public List<string> Students { get; set; } = new();
        public int Score { get; set; }
        /// <summary>Endgame turns this Team has left; null outside the endgame.</summary>
        public int? EndgameTurnsLeft { get; set; }
    }

    public class AnswerKeyEntryDTO
    {
        /// <summary>"A"–"D" or "Final".</summary>
        public string Target { get; set; } = string.Empty;
        public string Solution { get; set; } = string.Empty;
    }

    /// <summary>
    /// A hosted game as a screen shows it (docs/quiz/classroom.md). The Controller's view and a
    /// Display's are this one class; the Display's never carries <see cref="ScreenCode"/>,
    /// <see cref="AnswerKey"/> or <see cref="UndoLabel"/> — pinned by HostedViewSecrecyTests.
    /// </summary>
    public class HostedGameViewDTO
    {
        public Guid Id { get; set; }
        public int QuizId { get; set; }
        public string QuizTitle { get; set; } = string.Empty;
        public List<HostedTeamDTO> Teams { get; set; } = new();
        public int FirstSeat { get; set; }
        /// <summary>The Team whose turn it is; null once over.</summary>
        public int? CurrentSeat { get; set; }

        public bool CanOpen { get; set; }
        public bool CanGuess { get; set; }
        public bool CanPass { get; set; }
        public bool InEndgame { get; set; }
        public bool IsOver { get; set; }
        public string? EndReason { get; set; }

        public bool Timed { get; set; }
        public int? GameSeconds { get; set; }
        public int? TurnSeconds { get; set; }
        public DateTime? GameDeadlineUtc { get; set; }
        public DateTime? TurnDeadlineUtc { get; set; }
        public bool IsPaused { get; set; }
        /// <summary>Seconds left on each clock while paused (deadlines don't mean anything then).</summary>
        public int? GameSecondsLeft { get; set; }
        public int? TurnSecondsLeft { get; set; }
        /// <summary>The game clock has run out; the game ends when the round does.</summary>
        public bool LastRound { get; set; }
        public DateTime ServerNow { get; set; }

        public List<AssociationColumnViewDTO> Columns { get; set; } = new();
        public AssociationFinalViewDTO Final { get; set; } = new();
        public List<AssociationMoveViewDTO> Moves { get; set; } = new();

        // ── Controller only ──
        /// <summary>What Undo would take back ("opened B2", "Blue guessed A: Rome"); null when nothing can be undone.</summary>
        public string? UndoLabel { get; set; }
        public string? ScreenCode { get; set; }
        public int DisplaysConnected { get; set; }
        /// <summary>Only while a Display is connected (C8), so the Controller isn't the projected screen.</summary>
        public List<AnswerKeyEntryDTO>? AnswerKey { get; set; }
    }

    public class HostedMoveResultDTO
    {
        public HostedGameViewDTO Game { get; set; } = new();
        /// <summary>For a Guess: right or wrong; null otherwise, and null when it came too late to count.</summary>
        public bool? IsCorrect { get; set; }
        public int Points { get; set; }
    }

    public class HostedGameSummaryDTO
    {
        public Guid Id { get; set; }
        public int QuizId { get; set; }
        public string QuizTitle { get; set; } = string.Empty;
        public DateTime StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
        public bool IsOver { get; set; }
        public bool IsPaused { get; set; }
        public string? EndReason { get; set; }
        public List<HostedTeamDTO> Teams { get; set; } = new();
    }
}
