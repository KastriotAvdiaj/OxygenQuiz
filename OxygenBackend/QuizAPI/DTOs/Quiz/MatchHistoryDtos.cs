namespace QuizAPI.DTOs.Quiz
{
    /// <summary>
    /// One played match, as a line in a list: which quiz, when, who won, and each player's score
    /// with the session id that holds their answers. It carries no answers itself — a review loads
    /// <c>/quizsessions/{sessionId}/results</c> for the player it wants to look at, the same read
    /// the results page uses, guarded by the same match-peer rule.
    /// See docs/quiz/multiplayer.md §7.6.
    /// </summary>
    public sealed class MatchSummaryDto
    {
        public Guid MatchId { get; set; }

        /// <summary>
        /// What groups matches into "one lobby": <c>Match.LobbyId</c>, or the match's own id for a
        /// match recorded before lobbies had one — so each of those is a group of one.
        /// </summary>
        public Guid LobbyKey { get; set; }

        public string RoomCode { get; set; } = string.Empty;
        public int QuizId { get; set; }
        public string QuizTitle { get; set; } = string.Empty;

        /// <summary>"Classic" or "Associations" — a Duel is a match too.</summary>
        public string Format { get; set; } = "Classic";

        public DateTime StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }

        /// <summary>Highest score first.</summary>
        public List<MatchSummaryPlayerDto> Players { get; set; } = new();
    }

    public sealed class MatchSummaryPlayerDto
    {
        public Guid SessionId { get; set; }
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? ProfileImageUrl { get; set; }
        public int TotalScore { get; set; }

        /// <summary>False for everyone on a tie — <c>Match.WinnerUserId</c> is null then.</summary>
        public bool IsWinner { get; set; }
    }

    /// <summary>
    /// One lobby in a player's history: every match they played in it, oldest first. Everything a
    /// row shows about the lobby — how many matches, how many of them this player won, who else
    /// was there — is derived from <see cref="Matches"/> by the client, so the list and its
    /// expanded rows cannot disagree.
    /// </summary>
    public sealed class LobbyHistoryDto
    {
        public Guid LobbyKey { get; set; }
        public string RoomCode { get; set; } = string.Empty;
        public DateTime StartedAt { get; set; }
        public DateTime LastPlayedAt { get; set; }
        public List<MatchSummaryDto> Matches { get; set; } = new();
    }
}
