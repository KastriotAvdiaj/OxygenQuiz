using QuizAPI.ManyToManyTables;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuizAPI.Models.Quiz
{

    public enum AbandonmentReason
    {
        UserInitiated,      // User chose to abandon
        Timeout,           // Automatic abandonment due to inactivity
        SystemCleanup      // Background cleanup job
    }

    /// <summary>
    /// How the session was played. SinglePlayer is 0 so every row that existed before multiplayer
    /// persistence backfills to it without a data migration — which is also the truth about them.
    /// </summary>
    public enum QuizSessionMode
    {
        SinglePlayer = 0,
        Multiplayer = 1
    }
    public class QuizSession
    {
        [Key]
        public Guid Id { get; set; }
        public int QuizId { get; set; }
        public Guid UserId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public int TotalScore { get; set; }
        public bool IsCompleted { get; set; } = false;
        public int? CurrentQuizQuestionId { get; set; }
        public DateTime? CurrentQuestionStartTime { get; set; }

        /// <summary>
        /// The <see cref="Quiz.Version"/> in effect when this session started. The session only
        /// ever sees QuizQuestion rows visible to this version (see docs/quiz/quiz-editing.md), so an
        /// owner editing the quiz mid-game never changes what an in-flight player is served.
        /// </summary>
        public int QuizVersion { get; set; } = 1;

        [ForeignKey(nameof(QuizId))]
        public virtual Quiz Quiz { get; set; } = null!;
        [ForeignKey(nameof(UserId))]
        public virtual User User { get; set; } = null!;
        [ForeignKey(nameof(CurrentQuizQuestionId))]
        public virtual QuizQuestion? CurrentQuizQuestion { get; set; }
        public virtual ICollection<UserAnswer> UserAnswers { get; set; } = new List<UserAnswer>();

        public AbandonmentReason? AbandonmentReason { get; set; }
        public DateTime? AbandonedAt { get; set; }

        /// <summary>
        /// True for sessions created through the anonymous guest-play path (see docs/auth/guest-play.md).
        /// Guest sessions all share <see cref="QuizAPI.Services.GuestAccount.Id"/> as their UserId
        /// and are deleted immediately once the guest views their results — never kept around.
        /// </summary>
        public bool IsGuestSession { get; set; } = false;

        /// <summary>
        /// Single player, or one player's share of a multiplayer match. The distinction is not
        /// cosmetic: a match session is created and completed inside the match loop and never looks
        /// like an in-flight single-player session, so the abandonment sweeper and the resume path
        /// both have to know to leave it alone. Quiz analytics read it too — multiplayer plays are
        /// excluded from an author's averages by default, because a fixed clock and social pressure
        /// depress scores for reasons that have nothing to do with question quality.
        ///
        /// See docs/quiz/multiplayer.md §7.
        /// </summary>
        public QuizSessionMode Mode { get; set; } = QuizSessionMode.SinglePlayer;

        /// <summary>
        /// The match this session belonged to; null for every single-player session. It is what ties
        /// one player's answers to the other players' — the review screen's per-player tabs are this
        /// foreign key read backwards.
        /// </summary>
        public Guid? MatchId { get; set; }

        [ForeignKey(nameof(MatchId))]
        public virtual Match? Match { get; set; }
    }
}
