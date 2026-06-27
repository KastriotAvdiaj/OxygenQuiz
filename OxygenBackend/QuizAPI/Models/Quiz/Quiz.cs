using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using QuizAPI.ManyToManyTables;

namespace QuizAPI.Models.Quiz
{

    /// <summary>
    /// A quiz's single source of truth for who can reach it. Replaces the former
    /// Visibility / IsPublished / IsActive trio (see docs/quiz-visibility.md).
    /// </summary>
    public enum QuizStatus
    {
        /// <summary>Work in progress — only the owner (and admins) can see or play it.</summary>
        Draft,

        /// <summary>
        /// Published but not discoverable. Playable only by someone holding the quiz's
        /// <see cref="Quiz.ShareToken"/> link or invited into a lobby hosting it.
        /// </summary>
        Unlisted,

        /// <summary>Published and discoverable in the public catalogue; anyone can play.</summary>
        Public
    }

    public class Quiz
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(255)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }


        [Required]
        public Guid UserId { get; set; } 

        
        [ForeignKey(nameof(UserId))]
        [JsonIgnore]
        public User User { get; set; }

        public int CategoryId { get; set; }

        [JsonIgnore]
        [ForeignKey(nameof(CategoryId))]
        public QuestionCategory Category { get; set; }

        public int LanguageId { get; set; }

        public string? ImageUrl { get; set; }


        [JsonIgnore]
        [ForeignKey(nameof(LanguageId))]
        public QuestionLanguage Language { get; set; }

        [MinLength(0), MaxLength(2000)]
        public int? TimeLimitInSeconds { get; set; } = 0; 

        public bool ShowFeedbackImmediately { get; set; } = false;

        public int DifficultyId { get; set; }

        [JsonIgnore]
        [ForeignKey(nameof(DifficultyId))]
        public QuestionDifficulty Difficulty { get; set; }

        [Required]
        public bool ShuffleQuestions { get; set; } = false;

        [Required]
        public QuizStatus Status { get; set; } = QuizStatus.Draft;

        /// <summary>
        /// Unguessable token that grants play access to an <see cref="QuizStatus.Unlisted"/> quiz.
        /// Null until the owner generates a share link; cleared has no effect on Public/Draft quizzes.
        /// Unique when present (filtered index in <see cref="Data.ApplicationDbContext"/>).
        /// </summary>
        [MaxLength(64)]
        public string? ShareToken { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;


        public int Version { get; set; } = 1;

        /// <summary>
        /// Soft-delete marker. Null = live. When set, the quiz is hidden from every query by the
        /// global query filter (see ApplicationDbContext) while its played sessions / user answers
        /// stay intact. Admins can still surface these rows via IgnoreQueryFilters.
        /// </summary>
        public DateTime? DeletedAt { get; set; }


        public ICollection<QuizQuestion> QuizQuestions { get; set; } = new List<QuizQuestion>();
    }
}
