using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Quiz
{
    // Authoring DTOs for Associations quizzes (docs/quiz/associations.md, "Authoring").
    //
    // A board quiz is created and updated WHOLE — metadata and Board in one request, one
    // SaveChanges — so a quiz can never exist without its Board, and a half-saved Board can't
    // exist at all. Size and content rules are enforced by AssociationBoardValidator, not by
    // attributes here, so every rule produces a message that names the Column and Tile.

    /// <summary>One Column as the builder sends it: four Tile texts in order, and its solution.</summary>
    public class AssociationColumnInput
    {
        public List<string> Tiles { get; set; } = new();
        public string Solution { get; set; } = string.Empty;
        public List<string> AcceptableSolutions { get; set; } = new();
    }

    /// <summary>A whole Board as the builder sends it: Columns A–D in order, and the Final.</summary>
    public class AssociationBoardInput
    {
        public List<AssociationColumnInput> Columns { get; set; } = new();
        public string FinalSolution { get; set; } = string.Empty;
        public List<string> FinalAcceptableSolutions { get; set; } = new();
    }

    /// <summary>Create an Associations quiz: the quiz fields a Board uses, plus the Board.</summary>
    public class AssociationQuizCM
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

        [Required]
        public int DifficultyId { get; set; }

        /// <summary>Draft / Unlisted / Public.</summary>
        public string Status { get; set; } = nameof(Models.Quiz.QuizStatus.Draft);

        public string? ImageUrl { get; set; }

        /// <summary>
        /// Solo board time. Stored in <c>Quiz.TimeLimitInSeconds</c>, which the catalogue already
        /// shows as a quiz's duration. Range comes from <c>AssociationRules</c>, not an attribute,
        /// so it follows configuration.
        /// </summary>
        public int BoardTimeInSeconds { get; set; }

        [Required]
        public AssociationBoardInput Board { get; set; } = new();
    }

    /// <summary>Update an Associations quiz. <see cref="Version"/> is the optimistic-concurrency token (409 when stale).</summary>
    public class AssociationQuizUM : AssociationQuizCM
    {
        [Required]
        public int Id { get; set; }

        [Required]
        public int Version { get; set; }
    }

    /// <summary>
    /// The full Board, solutions included — the builder's edit read. Served to the owner (or an
    /// admin) only: it is the answer key.
    /// </summary>
    public class AssociationBoardDTO
    {
        public int QuizId { get; set; }

        /// <summary>The quiz version this read reflects — sent back as <c>Version</c> on save.</summary>
        public int Version { get; set; }

        public int BoardTimeInSeconds { get; set; }
        public List<AssociationColumnDTO> Columns { get; set; } = new();
        public string FinalSolution { get; set; } = string.Empty;
        public List<string> FinalAcceptableSolutions { get; set; } = new();
    }

    public class AssociationColumnDTO
    {
        /// <summary>"A"–"D".</summary>
        public string Letter { get; set; } = string.Empty;
        public List<AssociationTileDTO> Tiles { get; set; } = new();
        public string Solution { get; set; } = string.Empty;
        public List<string> AcceptableSolutions { get; set; } = new();
    }

    public class AssociationTileDTO
    {
        public int Id { get; set; }
        /// <summary>0–3 within the Column.</summary>
        public int Position { get; set; }
        public string Text { get; set; } = string.Empty;
    }
}
