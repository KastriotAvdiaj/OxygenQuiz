using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuizAPI.Models.Associations
{
    /// <summary>
    /// The content of an Associations quiz: four <see cref="AssociationColumn"/>s and a Final
    /// solution. One live Board per quiz. See docs/quiz/associations.md.
    ///
    /// <para><b>Copy-on-write, like <c>QuizQuestion</c>.</b> A Board row is never updated in place
    /// once created. Editing the Board inserts a new one at <see cref="CreatedInVersion"/> =
    /// the quiz's new version and stamps this one's <see cref="RemovedInVersion"/>, so a game
    /// pinned to an older quiz version still plays — and is later reviewed against — exactly the
    /// Board its players saw. A metadata-only edit bumps the quiz's version without copying the
    /// Board. See docs/quiz/quiz-editing.md for the pattern.</para>
    /// </summary>
    public class AssociationBoard
    {
        [Key]
        public int Id { get; set; }

        public int QuizId { get; set; }

        [ForeignKey(nameof(QuizId))]
        public Quiz.Quiz Quiz { get; set; } = null!;

        [MaxLength(AssociationBoardLimits.MaxTextLength)]
        public string FinalSolution { get; set; } = string.Empty;

        /// <summary>Other spellings that also count for the Final. JSON column, capped like typed answers.</summary>
        public List<string> FinalAcceptableSolutions { get; set; } = new();

        /// <summary>The quiz version this Board first appeared in.</summary>
        public int CreatedInVersion { get; set; } = 1;

        /// <summary>The quiz version this Board was replaced in. Null = the quiz's current Board.</summary>
        public int? RemovedInVersion { get; set; }

        public ICollection<AssociationColumn> Columns { get; set; } = new List<AssociationColumn>();

        [NotMapped]
        public bool IsLive => RemovedInVersion == null;

        /// <summary>True if this Board is the one a game pinned to <paramref name="quizVersion"/> plays.</summary>
        public bool IsVisibleToVersion(int quizVersion) =>
            CreatedInVersion <= quizVersion
            && (RemovedInVersion == null || RemovedInVersion > quizVersion);
    }

    /// <summary>One of a Board's four lettered Columns (Position 0–3 = A–D).</summary>
    public class AssociationColumn
    {
        [Key]
        public int Id { get; set; }

        public int BoardId { get; set; }

        [ForeignKey(nameof(BoardId))]
        public AssociationBoard Board { get; set; } = null!;

        /// <summary>0–3, shown as A–D.</summary>
        public int Position { get; set; }

        [MaxLength(AssociationBoardLimits.MaxTextLength)]
        public string Solution { get; set; } = string.Empty;

        public List<string> AcceptableSolutions { get; set; } = new();

        public ICollection<AssociationTile> Tiles { get; set; } = new List<AssociationTile>();
    }

    /// <summary>
    /// One hidden clue (Position 0–3 = 1–4 within its Column). Tiles keep their authored order —
    /// they are never shuffled; the order is part of the author's design (docs/quiz/associations.md §3.1).
    /// </summary>
    public class AssociationTile
    {
        [Key]
        public int Id { get; set; }

        public int ColumnId { get; set; }

        [ForeignKey(nameof(ColumnId))]
        public AssociationColumn Column { get; set; } = null!;

        public int Position { get; set; }

        [MaxLength(AssociationBoardLimits.MaxTextLength)]
        public string Text { get; set; } = string.Empty;
    }

    /// <summary>The Board's size and text limits — one definition, read by the model, the validator and the DTOs.</summary>
    public static class AssociationBoardLimits
    {
        public const int ColumnCount = 4;
        public const int TilesPerColumn = 4;

        /// <summary>A Tile, a Column solution or the Final solution. Mirrored by the builder's zod schema.</summary>
        public const int MaxTextLength = 100;

        /// <summary>Alternative spellings per solution — the same cap typed answers have.</summary>
        public const int MaxAcceptableSolutions = AcceptableAnswerRules.MaxCount;
    }
}
