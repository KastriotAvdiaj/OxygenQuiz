using System.Collections.Generic;

namespace QuizAPI.Services.QuizSessionServices
{
    // ─────────────────────────────────────────────────────────────────────────────
    // Data contracts for a live multiplayer match. "Round*" types that end in *View or
    // *Result are sent to clients; RoundQuestion is server-only (it carries the QuizQuestion
    // join id used for grading and never the correct answer).
    // ─────────────────────────────────────────────────────────────────────────────

    /// <summary>Server-side question for a running match. Not serialized to clients.</summary>
    public sealed class RoundQuestion
    {
        public int QuizQuestionId { get; init; }   // QuizQuestion.Id (join row) — grading key
        public int QuestionId { get; init; }
        public string Type { get; init; } = string.Empty;   // MultipleChoice / TrueFalse / TypeTheAnswer
        public string Text { get; init; } = string.Empty;
        public string? ImageUrl { get; init; }
        public int TimeLimitSeconds { get; init; }
        public IReadOnlyList<RoundOption> Options { get; init; } = new List<RoundOption>();
        public bool AllowMultipleSelections { get; init; }   // MC questions with >1 correct option
    }

    /// <summary>An answer choice shown to players. Deliberately has no "IsCorrect".</summary>
    public sealed class RoundOption
    {
        public int Id { get; init; }
        public string Text { get; init; } = string.Empty;
    }

    /// <summary>The client-facing payload broadcast when a question opens.</summary>
    public sealed class RoundQuestionView
    {
        public int Index { get; init; }      // 0-based position in the quiz
        public int Total { get; init; }      // number of questions in the match
        public int QuestionId { get; init; }
        public string Type { get; init; } = string.Empty;
        public string Text { get; init; } = string.Empty;
        public string? ImageUrl { get; init; }
        public int TimeLimitSeconds { get; init; }
        public IReadOnlyList<RoundOption> Options { get; init; } = new List<RoundOption>();
        public bool AllowMultipleSelections { get; init; }   // lets the client render checkboxes
    }

    /// <summary>How one player did on the question that just ended.</summary>
    public sealed class PlayerRoundResult
    {
        public string Username { get; init; } = string.Empty;
        public bool Answered { get; init; }
        public bool IsCorrect { get; init; }
        public int PointsAwarded { get; init; }
        public int TotalScore { get; init; }
    }

    /// <summary>Broadcast when a question closes: per-player outcome + current standings.</summary>
    public sealed class QuestionResult
    {
        public int Index { get; init; }
        public int QuestionId { get; init; }
        public IReadOnlyList<PlayerRoundResult> Players { get; init; } = new List<PlayerRoundResult>();
        public IReadOnlyList<ScoreboardEntry> Scoreboard { get; init; } = new List<ScoreboardEntry>();
    }

    /// <summary>One row of the live/final standings, ordered by score then correct count.</summary>
    public sealed class ScoreboardEntry
    {
        public string Username { get; init; } = string.Empty;
        public int Score { get; init; }
        public int Correct { get; init; }
    }

    /// <summary>Broadcast when the match ends.</summary>
    public sealed class MatchResult
    {
        public IReadOnlyList<ScoreboardEntry> Scoreboard { get; init; } = new List<ScoreboardEntry>();
        public string? WinnerUsername { get; init; }
    }

    /// <summary>A player's submission for the current round (kept in memory only).</summary>
    public sealed class RoundAnswer
    {
        public string Raw { get; init; } = string.Empty;   // option id (MC) or typed text (TF/TTA)
        public DateTime SubmittedUtc { get; init; }
    }
}
