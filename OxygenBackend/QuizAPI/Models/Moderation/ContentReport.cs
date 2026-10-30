using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Models.Moderation
{
    /// <summary>Why a viewer reported a question or quiz. docs/media/moderation.md, "The reasons".</summary>
    public enum ReportReason
    {
        WrongAnswer = 1,
        InappropriateMedia = 2,
        Offensive = 3,
        Spam = 4,
        Copyright = 5,
        Other = 6,
    }

    public enum ReportStatus
    {
        Open = 0,
        Resolved = 1,
    }

    /// <summary>How a report was closed — by the author (wrong answers) or a moderator.</summary>
    public enum ReportOutcome
    {
        /// <summary>The author corrected the question.</summary>
        Fixed = 1,
        /// <summary>The author reviewed it and stands by it.</summary>
        NotAMistake = 2,
        /// <summary>A moderator agreed and acted.</summary>
        Upheld = 3,
        /// <summary>A moderator found nothing wrong; anything auto-hidden is restored.</summary>
        Rejected = 4,
    }

    /// <summary>
    /// One viewer's report of a question or a quiz — the app's fact-checker and its moderation
    /// queue in one (docs/media/moderation.md). Named <c>ContentReport</c> because "Reports" used to
    /// mean the owner's statistics, renamed Statistics export so each word means one thing.
    ///
    /// <para><b>Target:</b> a question (<see cref="QuestionId"/> set; <see cref="QuizId"/> is the quiz
    /// it was reported from, when known) or a whole quiz (<see cref="QuestionId"/> null).</para>
    /// <para><b>One open report per person per item</b> — a filtered unique index and the service
    /// both enforce it; a resolved report doesn't block a new one.</para>
    /// </summary>
    public class ContentReport
    {
        public Guid Id { get; set; }

        public int? QuestionId { get; set; }
        [JsonIgnore] public QuestionBase? Question { get; set; }

        public int? QuizId { get; set; }
        [JsonIgnore] public Quiz.Quiz? Quiz { get; set; }

        public Guid ReporterId { get; set; }

        public ReportReason Reason { get; set; }

        /// <summary>The reporter's words. Required for a wrong answer ("what's correct?") and Other.</summary>
        [MaxLength(MaxDetailsLength)]
        public string? Details { get; set; }

        public DateTime CreatedAt { get; set; }

        public ReportStatus Status { get; set; } = ReportStatus.Open;
        public ReportOutcome? Outcome { get; set; }

        [MaxLength(MaxNoteLength)]
        public string? ResolutionNote { get; set; }

        public Guid? ResolvedById { get; set; }
        public DateTime? ResolvedAt { get; set; }

        public const int MaxDetailsLength = 1000;
        public const int MaxNoteLength = 500;

        /// <summary>The reasons that can hide content on their own (10 distinct reporters) and go
        /// straight to the Urgent lane. A wrong answer never hides anything.</summary>
        public static bool IsHarmful(ReportReason reason) =>
            reason is ReportReason.InappropriateMedia or ReportReason.Offensive;
    }
}
