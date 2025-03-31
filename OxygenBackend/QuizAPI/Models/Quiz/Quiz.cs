using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using QuizAPI.ManyToManyTables;

namespace QuizAPI.Models.Quiz
{
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

       /* [Required]
        [MaxLength(255)]
        public string Slug { get; set; } = string.Empty;*/

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

        [JsonIgnore]
        [ForeignKey(nameof(LanguageId))]
        public QuestionLanguage Language { get; set; }


        [Required]
        public bool ShuffleQuestions { get; set; } = false;

        [Required]
        public bool ShuffleAnswers { get; set; } = false;

        [Required]
        public bool IsPublished { get; set; } = false; 

        [Required]
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;


        public int Version { get; set; } = 1;


        public ICollection<QuizQuestion> QuizQuestions { get; set; } = new List<QuizQuestion>();
    }
}
