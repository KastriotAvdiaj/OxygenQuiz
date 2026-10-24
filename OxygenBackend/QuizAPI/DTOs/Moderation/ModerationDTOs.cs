using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Moderation
{
    /// <summary>A viewer's report (POST /api/reports). Exactly one target: a question (optionally
    /// with the quiz it was seen in) or a quiz.</summary>
    public sealed class SubmitReportCM
    {
        public int? QuestionId { get; set; }
        public int? QuizId { get; set; }

        /// <summary>WrongAnswer, InappropriateMedia, Offensive, Spam, Copyright, Other.</summary>
        [Required]
        public string Reason { get; set; } = string.Empty;

        /// <summary>Required for WrongAnswer and Other; optional otherwise. ≤ 1000 characters.</summary>
        public string? Details { get; set; }
    }

    public sealed class ReportReceiptDTO
    {
        public Guid Id { get; set; }
        public string Reason { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>An author's answer to the wrong-answer reports on one of their questions or quizzes.</summary>
    public sealed class RespondToReportsCM
    {
        public int? QuestionId { get; set; }
        public int? QuizId { get; set; }

        /// <summary>Fixed or NotAMistake.</summary>
        [Required]
        public string Outcome { get; set; } = string.Empty;

        /// <summary>Required for NotAMistake (why it's correct); optional for Fixed.</summary>
        public string? Note { get; set; }
    }

    /// <summary>A moderator's decision on everything open about one target.</summary>
    public sealed class ResolveReportsCM
    {
        public int? QuestionId { get; set; }
        public int? QuizId { get; set; }

        /// <summary>Upheld or Rejected. Rejecting restores hidden media and releases holds.</summary>
        [Required]
        public string Outcome { get; set; } = string.Empty;

        /// <summary>With Upheld: remove the question's media (or the quiz's cover) everywhere it is
        /// used, and block the same file from being uploaded again.</summary>
        public bool RemoveMedia { get; set; }

        /// <summary>With Upheld: hold the quiz (or every quiz the question is live in).</summary>
        public bool HoldQuiz { get; set; }

        public string? Note { get; set; }
    }

    /// <summary>One reported thing in a queue: everything about it, and its reports.</summary>
    public sealed class ReportTargetDTO
    {
        /// <summary>Urgent, NeedsAttention, WithAuthor or Resolved.</summary>
        public string Lane { get; set; } = string.Empty;

        /// <summary>Question or Quiz.</summary>
        public string TargetType { get; set; } = string.Empty;
        public int? QuestionId { get; set; }
        public int? QuizId { get; set; }

        /// <summary>The question's text, or the quiz's title.</summary>
        public string Title { get; set; } = string.Empty;

        public Guid? MediaAssetId { get; set; }
        public string? MediaUrl { get; set; }
        public string MediaType { get; set; } = "None";
        public bool MediaHidden { get; set; }

        public bool QuizHeld { get; set; }
        public bool QuizPicked { get; set; }

        public Guid AuthorId { get; set; }
        public string Author { get; set; } = string.Empty;

        public int OpenCount { get; set; }
        public Dictionary<string, int> ReasonCounts { get; set; } = new();
        public DateTime FirstReportedAt { get; set; }
        public DateTime LastReportedAt { get; set; }

        /// <summary>Newest first, at most 20. Reporters are never named.</summary>
        public List<ReportEntryDTO> Reports { get; set; } = new();
    }

    public sealed class ReportEntryDTO
    {
        public Guid Id { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? Details { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Outcome { get; set; }
        public string? ResolutionNote { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }

    /// <summary>The URL behind a hidden image, for a signed-in player who chose "Show anyway".</summary>
    public sealed class HiddenMediaDTO
    {
        public string MediaUrl { get; set; } = string.Empty;
        public string MediaType { get; set; } = "None";
    }
}
