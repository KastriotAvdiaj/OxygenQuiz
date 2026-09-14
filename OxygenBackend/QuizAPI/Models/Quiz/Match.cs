using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuizAPI.Models.Quiz
{
    /// <summary>
    /// One played multiplayer game. The header row only — everything a PLAYER did lives in the same
    /// <see cref="QuizSession"/> and <see cref="UserAnswer"/> rows single player already writes, one
    /// session per participant, tagged with <see cref="QuizSession.MatchId"/>.
    ///
    /// <para><b>Why not its own answer tables.</b> A parallel Match/MatchParticipant/MatchAnswer set
    /// keeps single-player numbers safe by construction, and costs a second reader for every
    /// consumer — a second analytics query, a second stats query, a second results page — each of
    /// which has to be kept in step with the first forever. Writing the existing tables means
    /// analytics, personal stats and the results screens work without being taught what a match is.
    /// See docs/quiz/multiplayer.md §7.</para>
    ///
    /// <para>This row holds only what belongs to the match rather than to any one player: which quiz
    /// and which version of it, the room it was played in, who hosted, when it ran, and who won.</para>
    ///
    /// <para><b>A rematch is a new Match.</b> It is a separate game with separate answers; the lobby
    /// is what persists across it, not the match (docs/quiz/multiplayer.md §3.1).</para>
    /// </summary>
    public class Match
    {
        [Key]
        public Guid Id { get; set; }

        public int QuizId { get; set; }

        /// <summary>
        /// The <see cref="Quiz.Version"/> in effect when the match started, pinned for the same
        /// reason <see cref="QuizSession.QuizVersion"/> is: the author editing the quiz mid-game
        /// must not change what the players were asked, or what their answers are later judged
        /// against. Every session in the match shares this version — they were all in one room being
        /// asked the same questions.
        /// </summary>
        public int QuizVersion { get; set; } = 1;

        /// <summary>
        /// The lobby's room code (the in-memory session id players typed to get in). Kept for the
        /// record even though lobbies are ephemeral: it is how a player refers to the game
        /// afterwards, and it is not derivable from anything else once the lobby is gone.
        /// </summary>
        [MaxLength(64)]
        public string RoomCode { get; set; } = string.Empty;

        public Guid HostUserId { get; set; }

        public DateTime StartedAt { get; set; }

        /// <summary>
        /// Null while the match is running, and still null if the server died mid-game — the row is
        /// written once, at the end (see MatchOrchestrator), so in practice an unfinished match
        /// leaves no row at all rather than a half one.
        /// </summary>
        public DateTime? EndedAt { get; set; }

        /// <summary>
        /// Null on a tie, or when everyone left before the end. Denormalised on purpose: it is
        /// derivable from the sessions' scores, but the tiebreak that decided it (score, then
        /// correct count) lived in the match loop, and recomputing it later from the rows would be a
        /// second implementation of that rule, free to disagree with the one the players were shown.
        /// </summary>
        public Guid? WinnerUserId { get; set; }

        [ForeignKey(nameof(QuizId))]
        public virtual Quiz Quiz { get; set; } = null!;

        [ForeignKey(nameof(HostUserId))]
        public virtual User HostUser { get; set; } = null!;

        [ForeignKey(nameof(WinnerUserId))]
        public virtual User? WinnerUser { get; set; }

        /// <summary>One per participant who played — the rows that hold the actual answers.</summary>
        public virtual ICollection<QuizSession> Sessions { get; set; } = new List<QuizSession>();
    }
}
