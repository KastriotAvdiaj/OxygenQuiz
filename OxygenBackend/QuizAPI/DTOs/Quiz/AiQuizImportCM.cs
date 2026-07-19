using System.ComponentModel.DataAnnotations;
using QuizAPI.DTOs.Question;

namespace QuizAPI.DTOs.Quiz
{
    /// <summary>
    /// Payload for <c>POST /api/quiz/ai-import</c> — the AI-assisted quiz creation flow.
    ///
    /// Unlike <see cref="QuizCM"/> (which references questions that already exist by id), this
    /// carries the questions <b>inline</b> so the server can create them and the quiz in ONE
    /// transaction. That atomicity is the whole point: the previous flow created each question
    /// with its own committed request and then created the quiz separately, so a failure after
    /// the questions were created left orphaned, quiz-less question rows. Here, if anything
    /// fails, the entire import rolls back. See docs/quiz/ai-quiz-architecture.md §7.
    ///
    /// Design invariants enforced here (not merely in the UI):
    ///  - Questions inherit the quiz's Category and Language — those are NOT accepted per-question.
    ///  - No entity is ever created as a side effect; every referenced id must already exist.
    ///  - Generated questions are always created Private (they belong to this quiz, not the bank).
    /// </summary>
    public class AiQuizImportCM
    {
        [Required]
        [MaxLength(255)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        [Required]
        public int CategoryId { get; set; }

        [Required]
        public int LanguageId { get; set; }

        /// <summary>The quiz's overall difficulty, and the fallback for any question difficulty.</summary>
        [Required]
        public int DifficultyId { get; set; }

        /// <summary>Draft / Unlisted / Public. Defaults to Draft on anything unrecognised.</summary>
        public string Status { get; set; } = nameof(Models.Quiz.QuizStatus.Draft);

        public bool ShowFeedbackImmediately { get; set; } = false;
        public bool ShuffleQuestions { get; set; } = false;
        public string? ImageUrl { get; set; }

        [Required]
        [MinLength(1, ErrorMessage = "A quiz must have at least one question.")]
        public List<AiImportQuestionCM> Questions { get; set; } = new();
    }

    /// <summary>
    /// One inline question in an AI import. A flat, discriminator-based shape (rather than a
    /// polymorphic hierarchy) so it binds cleanly from JSON — the type-specific fields are
    /// nullable and only the ones relevant to <see cref="Type"/> are read.
    ///
    /// Category and Language are deliberately absent: they always come from the parent quiz.
    /// </summary>
    public class AiImportQuestionCM
    {
        /// <summary>
        /// When set, this row links an already-existing question (e.g. one the user picked from
        /// the bank during review) instead of creating a new one. The content fields below are
        /// ignored in that case; only the per-quiz settings apply.
        /// </summary>
        public int? ExistingQuestionId { get; set; }

        /// <summary>"MultipleChoice" | "TrueFalse" | "TypeTheAnswer". Required for new questions.</summary>
        public string? Type { get; set; }

        public string? Text { get; set; }

        /// <summary>Resolved (by the client) to an existing difficulty id; re-validated server-side.</summary>
        public int DifficultyId { get; set; }

        public string? ImageUrl { get; set; }

        // ── Per-quiz settings (the QuizQuestion join row) ──
        public string PointSystem { get; set; } = "Standard";

        [Range(0, 2000)]
        public int TimeLimitInSeconds { get; set; } = 10;

        public int OrderInQuiz { get; set; }

        // ── MultipleChoice ──
        public List<AnswerOptionCM>? AnswerOptions { get; set; }
        public bool AllowMultipleSelections { get; set; }

        // ── TrueFalse ──
        public bool? CorrectAnswerBoolean { get; set; }

        // ── TypeTheAnswer ──
        public string? CorrectAnswerText { get; set; }
        public bool IsCaseSensitive { get; set; }
        public bool AllowPartialMatch { get; set; }
        public List<string>? AcceptableAnswers { get; set; }
    }
}
