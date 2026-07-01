using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.User;
using QuizAPI.ManyToManyTables;
using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Quiz
{
        public class QuizCM
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

            [Range(0, 2000)]
            public int? TimeLimitInSeconds { get; set; } = 0; //THIS IS THE OVERALL TIME LIMIT FOR THE QUIZ, NOT FOR EACH QUESTION

            public bool ShowFeedbackImmediately { get; set; } = false;

            /// <summary>Draft / Unlisted / Public (see <see cref="Models.Quiz.QuizStatus"/>).</summary>
            public string Status { get; set; } = nameof(Models.Quiz.QuizStatus.Draft);


            [Required]
            public int DifficultyId { get; set; }

            public bool ShuffleQuestions { get; set; } = false;
            public string? ImageUrl { get; set; }


        [Required]
            public ICollection<QuizQuestionCM> Questions { get; set; } = new List<QuizQuestionCM>();
        }

    public class QuizSummaryDTO
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description{ get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty; 
        public string Difficulty { get; set; } = string.Empty; 
        public string Language { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public int TimeLimitInSeconds { get; set; }

        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int QuestionCount { get; set; }
        public string User { get; set; } = string.Empty;

        public string? ColorPaletteJson { get; set; }

        public bool Gradient {  get; set; } = false;

        // Soft-delete timestamp. Null = live. Only ever non-null in admin (includeDeleted) reads;
        // the frontend uses it to badge a row as deleted.
        public DateTime? DeletedAt { get; set; }

    }
    public class QuizDTO
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
       public UserBasicDTO User { get; set; }

       public QuestionCategoryDTO Category { get; set; } = new();

        public QuestionLanguageDTO Language { get; set; } = new();

        public QuestionDifficultyDTO Difficulty { get; set; } = new();

        public int TimeLimitInSeconds { get; set; }
        public bool ShowFeedbackImmediately { get; set; }

        public string Status { get; set; } = string.Empty;

        /// <summary>
        /// The Unlisted share-link token. Only ever populated on the owner's own detail read so the
        /// owner can copy the link; null for everyone else and for Public/Draft quizzes.
        /// </summary>
        public string? ShareToken { get; set; }

        public bool ShuffleQuestions { get; set; }
        public DateTime CreatedAt { get; set; }
        public int Version { get; set; }

        public string? ImageUrl { get; set; }

        public int QuestionCount { get; set; }
        /*public List<QuizQuestionDTO> Questions { get; set; } = new List<QuizQuestionDTO>();*/
    }

    public class QuizUM
    {
        [Required] 
        public int Id { get; set; }

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

        /// <summary>Draft / Unlisted / Public (see <see cref="Models.Quiz.QuizStatus"/>).</summary>
        public string Status { get; set; } = nameof(Models.Quiz.QuizStatus.Draft);
        public string? ImageUrl { get; set; }


        public int? TimeLimitInSeconds { get; set; }
        public bool ShowFeedbackImmediately { get; set; }
        public bool ShuffleQuestions { get; set; }

        public ICollection<QuizQuestionUM> Questions { get; set; } = new List<QuizQuestionUM>();

        [Required]
        public int Version { get; set; }

    }

    /// <summary>Body for PATCH /api/quiz/{id}/status. Status is Draft / Unlisted / Public.</summary>
    public class SetQuizStatusRequest
    {
        [Required]
        public string Status { get; set; } = string.Empty;
    }

    /// <summary>Response for POST /api/quiz/{id}/share-link.</summary>
    public class ShareLinkResponse
    {
        public string ShareToken { get; set; } = string.Empty;
    }

}
