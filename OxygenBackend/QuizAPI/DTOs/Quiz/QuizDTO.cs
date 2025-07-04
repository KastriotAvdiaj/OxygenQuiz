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
            public string Visibility { get; set; } = string.Empty;


            [Required]
            public int DifficultyId { get; set; }

            public bool ShuffleQuestions { get; set; } = false;

            public bool IsPublished { get; set; } = false;
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

        public string Visibility { get; set; } = string.Empty;
        public bool IsPublished { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int QuestionCount { get; set; } 
        public string User { get; set; } = string.Empty; 

    }
    public class QuizDTO
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
       public UserBasicDTO User { get; set; }

       public CategoryDTO Category { get; set; } = new();

        public LanguageDTO Language { get; set; } = new();

        public DifficultyDTO Difficulty { get; set; } = new();

        public int TimeLimitInSeconds { get; set; }
        public bool ShowFeedbackImmediately { get; set; }

        public string Visibility { get; set; } = string.Empty;

        public bool ShuffleQuestions { get; set; }
        public bool IsPublished { get; set; }
        public bool IsActive { get; set; }
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

        public string Visibility { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }


        public int? TimeLimitInSeconds { get; set; }
        public bool ShowFeedbackImmediately { get; set; }
        public bool ShuffleQuestions { get; set; }
        public bool IsPublished { get; set; }
        public bool IsActive { get; set; } 

        public ICollection<QuizQuestionUM> Questions { get; set; } = new List<QuizQuestionUM>();

        [Required]
        public int Version { get; set; }

    }

}
