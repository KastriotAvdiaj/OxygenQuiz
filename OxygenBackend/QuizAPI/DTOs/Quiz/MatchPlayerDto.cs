namespace QuizAPI.DTOs.Quiz
{
    /// <summary>
    /// One player's line in a finished multiplayer match: who they were, how they did, and the
    /// session id that holds their answers.
    ///
    /// <para>Everyone in a match can see everyone's answers, permanently — you were all in the same
    /// room being asked the same questions, and hiding it a week later would be strange
    /// (docs/quiz/multiplayer.md §7). The session id is the point of this DTO: it is
    /// what lets the review screen show another player's answers through the page that already
    /// renders a session's answers.</para>
    /// </summary>
    public sealed class MatchPlayerDto
    {
        public Guid SessionId { get; set; }
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? ProfileImageUrl { get; set; }
        public int TotalScore { get; set; }
        public int CorrectAnswers { get; set; }

        /// <summary>
        /// Whether this player has questions they were not present for — the
        /// <c>NotAnswered</c> rows the match write leaves behind when someone leaves mid-game, as
        /// distinct from the <c>TimedOut</c> rows of someone who stayed and said nothing. The
        /// review screen uses it to say *left* instead of showing silent blanks.
        /// </summary>
        public bool LeftEarly { get; set; }

        /// <summary>True for the match's recorded winner; false for everyone on a tie.</summary>
        public bool IsWinner { get; set; }
    }
}
