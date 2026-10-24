
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Models.Statistics.Questions;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;


namespace QuizAPI.Models
{
   

    public enum QuestionVisibility
    {
        Global,   
        Private  
    }

    public enum QuestionType
    {
        MultipleChoice,
        TrueFalse,
        TypeTheAnswer,
    }

    public enum QuestionMediaType
    {
        None,
        Image,
        Audio,
        Video,
    }

    public abstract class QuestionBase
    {
        public int Id { get; set; }
        public string Text { get; set; } = string.Empty;

        /// <summary>
        /// The question's optional image or audio clip (docs/media/media-pipeline.md). The only
        /// writer is <c>MediaAttachmentService</c>, which also sets <see cref="MediaUrl"/> and
        /// <see cref="MediaType"/> from it — a client sends an asset id, never a URL.
        /// </summary>
        public Guid? MediaAssetId { get; set; }

        [JsonIgnore]
        public QuizAPI.Models.Media.MediaAsset? MediaAsset { get; set; }

        /// <summary>
        /// Copy of the asset's URL, kept on the row so every read path — SQL projections, the
        /// in-memory play DTO, multiplayer rounds — gets it without a join. Written only together
        /// with <see cref="MediaAssetId"/>.
        /// </summary>
        public string? MediaUrl { get; set; }

        /// <summary>Which kind of media <see cref="MediaUrl"/> points to. None when there is no attachment.</summary>
        public QuestionMediaType MediaType { get; set; } = QuestionMediaType.None;

        /// <summary>
        /// When this attachment was counted against its saver's daily media quota. Null when the
        /// asset was already in use elsewhere in the saver's content (a copy, a reused image),
        /// which costs nothing. docs/media/media-pipeline.md, "Quota counts what you save".
        /// </summary>
        public DateTime? MediaCountedAt { get; set; }

        /// <summary>
        /// Set when the media is hidden behind a cover pending review — automatically at 10
        /// distinct "inappropriate image or audio" reports, or by a moderator. Play DTOs then carry
        /// no URL; a signed-in player can still choose Show anyway. Cleared when a moderator rejects
        /// the reports. docs/media/moderation.md, "Hiding".
        /// </summary>
        public DateTime? MediaHiddenAt { get; set; }

        /// <summary>
        /// Optional "why" shown to a player after they answer. Null for every question written
        /// before it existed, and for any the author leaves blank. It reveals the answer, so it
        /// follows the answer key's serving rules — see <see cref="QuestionExplanation"/>.
        /// </summary>
        [MaxLength(QuestionExplanation.MaxLength)]
        public string? Explanation { get; set; }

        [Required]
        public QuestionVisibility Visibility { get; set; } = QuestionVisibility.Global;

        public int DifficultyId { get; set; }
        [JsonIgnore]
        public QuestionDifficulty Difficulty { get; set; }

        public int CategoryId { get; set; }
        [JsonIgnore]
        public QuestionCategory Category { get; set; }

        public int LanguageId { get; set; }
        [JsonIgnore]
        public QuestionLanguage Language { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Guid UserId { get; set; }
        [JsonIgnore]
        public User User { get; set; }

        public QuestionStatistics? Statistics { get; set; }

        [Required]
        public QuestionType Type { get; set; }

        public ICollection<QuizQuestion> QuizQuestions { get; set; } = new List<QuizQuestion>();

    }

    public class MultipleChoiceQuestion : QuestionBase
    {
        public MultipleChoiceQuestion()
        {
            Type = QuestionType.MultipleChoice;
        }

        public ICollection<AnswerOption> AnswerOptions { get; set; } = new List<AnswerOption>();

        public bool AllowMultipleSelections { get; set; } = false;
    }

    public class TrueFalseQuestion : QuestionBase
    {
        public TrueFalseQuestion()
        {
            Type = QuestionType.TrueFalse;
        }
        public bool CorrectAnswer { get; set; }
    }

    public class TypeTheAnswerQuestion : QuestionBase
    {
        public TypeTheAnswerQuestion()
        {
            Type = QuestionType.TypeTheAnswer;
        }

        public string CorrectAnswer { get; set; } = string.Empty;

        public bool IsCaseSensitive { get; set; } = false;

        public bool AllowPartialMatch { get; set; } = false;

        public List<string> AcceptableAnswers { get; set; } = new List<string>();
    }

}
