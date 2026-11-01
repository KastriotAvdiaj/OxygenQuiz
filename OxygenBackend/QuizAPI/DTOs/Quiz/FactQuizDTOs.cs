using System.ComponentModel.DataAnnotations;
using QuizAPI.Services.Facts;

namespace QuizAPI.DTOs.Quiz
{
    /// <summary>One pack, as the "From facts" page lists it (docs/quiz/fact-quizzes.md).</summary>
    public class FactPackDTO
    {
        public string Slug { get; set; } = string.Empty;
        public Dictionary<string, string> Title { get; set; } = new();
        public Dictionary<string, string> Description { get; set; } = new();
        public string? Category { get; set; }

        /// <summary>Languages the pack has templates for, with how many facts each can use.</summary>
        public Dictionary<string, int> FactsByLanguage { get; set; } = new();

        /// <summary>The question types its templates can produce.</summary>
        public List<string> QuestionTypes { get; set; } = new();

        public string? BuiltAt { get; set; }
        public string? EditorialNote { get; set; }

        public static FactPackDTO From(FactPack pack) => new()
        {
            Slug = pack.Slug,
            Title = pack.Title,
            Description = pack.Description,
            Category = pack.Category,
            FactsByLanguage = pack.Templates.Keys.ToDictionary(
                language => language,
                language => pack.Facts.Count(f => f.Labels.ContainsKey(language))),
            QuestionTypes = pack.Templates.Values
                .SelectMany(t => t.Keys)
                .Where(FactStyles.TypeOf.ContainsKey)
                .Select(s => FactStyles.TypeOf[s])
                .Distinct()
                .OrderBy(t => t, StringComparer.Ordinal)
                .ToList(),
            BuiltAt = pack.BuiltAt,
            EditorialNote = pack.EditorialNote,
        };
    }

    public class FactQuizRequestDTO
    {
        [Required, MaxLength(100)]
        public string PackSlug { get; set; } = string.Empty;

        /// <summary>A language the pack has templates for — "English" or "Albanian".</summary>
        [Required, MaxLength(100)]
        public string LanguageName { get; set; } = string.Empty;

        [Range(1, FactQuizBuilder.MaxQuestions)]
        public int QuestionCount { get; set; } = 10;

        public List<string> AllowedTypes { get; set; } = new();

        /// <summary>The app's difficulty names, so each question is rated in them.</summary>
        public List<string> DifficultyNames { get; set; } = new();
    }

    /// <summary>
    /// The same two fields a generation's success carries that the wizard reads: the reply JSON,
    /// and what it was written from. Reusing <see cref="AiGroundingDTO"/> is what lets the review
    /// show the source and run the quote check with no new code.
    /// </summary>
    public class FactQuizResponseDTO
    {
        public string Payload { get; set; } = string.Empty;
        public AiGroundingDTO Grounding { get; set; } = new();
    }
}
