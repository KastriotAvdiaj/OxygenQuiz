using QuizAPI.Models.Quiz;
using QuizAPI.Models;
using System.ComponentModel.DataAnnotations;

namespace QuizAPI.ManyToManyTables
{

    public enum PointSystem
    {
        Standard,
        Double,
        Quadruple,
    }

    /// <summary>
    /// Join row between a quiz and a question, versioned copy-on-write (see docs/quiz-editing.md).
    /// Rows are never updated in place or hard-deleted once created: an edit retires the old row
    /// (stamps <see cref="RemovedInVersion"/>) and inserts a replacement. In-flight sessions pin
    /// the <see cref="Models.Quiz.Quiz.Version"/> they started on and keep playing their rows,
    /// while <see cref="UserAnswer"/> history always references the exact row configuration
    /// (points / time limit) that was in effect when the answer was given.
    /// The former unique (QuizId, QuestionId) index is now filtered to live rows only —
    /// see ApplicationDbContext.
    /// </summary>
    public class QuizQuestion
    {

        // --- The Surrogate Primary Key ---
        // This is the simple, single key that other tables will reference.
        [Key]
        public int Id { get; set; }
        public int QuizId { get; set; }
        public virtual Quiz Quiz { get; set; } = null!;

        public int QuestionId { get; set; }
        public virtual QuestionBase Question { get; set; } = null!;


        // --- Contextual Data ---
        // This data belongs to the question *in the context of this specific quiz*
        public int TimeLimitInSeconds { get; set; } = 10;

        public PointSystem PointSystem { get; set; } = PointSystem.Standard;
        public int OrderInQuiz { get; set; }

        // --- Versioning (copy-on-write) ---

        /// <summary>The quiz version this row first appeared in.</summary>
        public int CreatedInVersion { get; set; } = 1;

        /// <summary>
        /// The quiz version this row was retired in (question removed, or its settings changed and
        /// a replacement row inserted). Null = live, i.e. part of the quiz's current content.
        /// </summary>
        public int? RemovedInVersion { get; set; }

        /// <summary>True while the row is part of the quiz's current (latest-version) content.</summary>
        public bool IsLive => RemovedInVersion == null;

        /// <summary>
        /// True if this row belonged to the quiz at <paramref name="quizVersion"/> — the check
        /// sessions use to replay exactly the version they started on.
        /// </summary>
        public bool IsVisibleToVersion(int quizVersion) =>
            CreatedInVersion <= quizVersion
            && (RemovedInVersion == null || RemovedInVersion > quizVersion);

        // A QuizQuestion can have many user answers across different sessions
        public virtual ICollection<UserAnswer> UserAnswers { get; set; } = new List<UserAnswer>();

    }
}
