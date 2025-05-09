﻿using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using QuizAPI.ManyToManyTables;
using Microsoft.CodeAnalysis.CSharp.Syntax;

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

        public int TimeLimitInSeconds { get; set; } = 0; //this is the total amount of seconds,accumulated out of all the questions.

        public bool ShowFeedbackImmediately;

        public int DifficultyId { get; set; }

        [JsonIgnore]
        [ForeignKey(nameof(DifficultyId))]
        public QuestionDifficulty Difficulty { get; set; }

        [Required]
        public bool ShuffleQuestions { get; set; } = false;


        [Required]
        public bool IsPublished { get; set; } = false; 

        [Required]
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;


        public int Version { get; set; } = 1;


        public ICollection<QuizQuestion> QuizQuestions { get; set; } = new List<QuizQuestion>();
    }
}
