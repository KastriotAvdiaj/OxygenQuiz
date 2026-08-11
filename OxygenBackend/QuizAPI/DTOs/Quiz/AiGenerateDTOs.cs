using System.ComponentModel.DataAnnotations;
using QuizAPI.Services.Ai;

namespace QuizAPI.DTOs.Quiz
{
    /// <summary>
    /// Payload for <c>POST /api/quiz/ai-generate</c> and <c>POST /api/quiz/ai-prompt</c>.
    ///
    /// <b>No entity ids cross this boundary.</b> Difficulties and the language arrive as names,
    /// exactly as the copy-paste prompt has always carried them, and the browser resolves them
    /// back to ids with machinery that already exists. That is what makes "the AI flow can never
    /// create an entity" true by construction rather than by review
    /// (docs/quiz/ai-quiz-creation-plan.md §2b).
    ///
    /// Slice 2.0 is JSON-only. Source material arrives as text; file upload and the multipart
    /// shape land in 2.3 (plan §12).
    /// </summary>
    public class AiGenerateCM
    {
        /// <summary>"Topic" or "Source". Unrecognised values are rejected, never defaulted —
        /// silently generating from the wrong mode would be a confusing failure.</summary>
        [Required]
        public string Mode { get; set; } = nameof(AiGenerationMode.Topic);

        /// <summary>Topic mode: what the quiz is about.</summary>
        [MaxLength(200)]
        public string? Topic { get; set; }

        /// <summary>Source mode: the material to build questions from.</summary>
        [MaxLength(40_000)]
        public string? SourceText { get; set; }

        /// <summary>
        /// The language the user explicitly picked. Optional: leave it out and the model chooses
        /// from <see cref="LanguageNames"/> — normally the language the topic was typed in — and
        /// reports its choice back for the user to confirm.
        /// </summary>
        [MaxLength(100)]
        public string? LanguageName { get; set; }

        /// <summary>
        /// Language names that exist in the DB. Required when <see cref="LanguageName"/> is
        /// omitted, since the model can only pick from names we hand it.
        /// </summary>
        public List<string> LanguageNames { get; set; } = new();

        /// <summary>
        /// Category names that exist in the DB. Send them and the model suggests the closest fit
        /// for the user to confirm; omit them and the category stays the user's to pick.
        /// </summary>
        public List<string> CategoryNames { get; set; } = new();

        /// <summary>Difficulty names that exist in the DB. The model must choose from these.</summary>
        [Required]
        [MinLength(1, ErrorMessage = "At least one difficulty name is required.")]
        public List<string> DifficultyNames { get; set; } = new();

        [Range(1, 30)]
        public int QuestionCount { get; set; } = 10;

        [Required]
        [MinLength(1, ErrorMessage = "Pick at least one question type.")]
        public List<string> AllowedTypes { get; set; } = new();

        [MaxLength(500)]
        public string? ExtraInstructions { get; set; }

        /// <summary>
        /// Maps to the service contract. Returns null when <see cref="Mode"/> is not a known mode,
        /// which the controller turns into a 400.
        /// </summary>
        public AiGenerationRequest? ToServiceRequest()
        {
            if (!Enum.TryParse<AiGenerationMode>(Mode, ignoreCase: true, out var mode))
                return null;

            return new AiGenerationRequest
            {
                Mode = mode,
                Topic = Topic,
                SourceText = SourceText,
                LanguageName = LanguageName,
                LanguageNames = LanguageNames,
                CategoryNames = CategoryNames,
                DifficultyNames = DifficultyNames,
                QuestionCount = QuestionCount,
                AllowedTypes = AllowedTypes,
                ExtraInstructions = ExtraInstructions,
            };
        }
    }

    /// <summary>
    /// Success shape. <see cref="Questions"/> is the model's raw JSON array, forwarded untouched
    /// for the browser's <c>parse-ai-output.ts</c> to validate — the same parser, and the same
    /// drop-with-reasons behaviour, that a pasted reply goes through (plan §5.2).
    /// </summary>
    public class AiGenerateResponse
    {
        /// <summary>The <c>{ "questions": [...] }</c> object, serialised as JSON.</summary>
        public string Payload { get; set; } = string.Empty;

        // ── Quiz-level suggestions, for pre-filling the review step ──
        // Deliberately separate fields rather than something the client digs out of Payload:
        // Payload belongs to parse-ai-output.ts, and handing it a second job would mean editing
        // the one file this whole design exists to leave alone.

        /// <summary>Suggested quiz title. Free text; null if the model didn't give one.</summary>
        public string? SuggestedTitle { get; set; }

        /// <summary>
        /// Suggested category NAME, guaranteed to be one of the <c>CategoryNames</c> the caller
        /// sent, or null. The client resolves it to an id against the list it already has —
        /// no id ever crosses this boundary.
        /// </summary>
        public string? SuggestedCategory { get; set; }

        /// <summary>Suggested language NAME, guaranteed the same way.</summary>
        public string? SuggestedLanguage { get; set; }

        /// <summary>Generations left today after this one, or <c>null</c> when unlimited.</summary>
        public int? QuotaRemaining { get; set; }

        public int InputTokens { get; set; }
        public int OutputTokens { get; set; }
    }

    /// <summary>
    /// Failure shape. <see cref="Code"/> is a closed set (<see cref="AiErrorCodes"/>) the client
    /// switches on; <see cref="Message"/> is already user-facing and safe to display.
    /// </summary>
    public class AiGenerateErrorResponse
    {
        public string Code { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;

        /// <summary>Set for quota exhaustion: when the daily window rolls over.</summary>
        public DateTime? RetryAfter { get; set; }

        /// <summary>Kept so the shared axios error interceptor surfaces the message verbatim.</summary>
        public bool IsCustomMessage { get; set; } = true;
    }

    public class AiQuotaResponse
    {
        public bool Enabled { get; set; }

        /// <summary>Daily allowance, or <c>null</c> for unlimited (staff). The UI branches on this.</summary>
        public int? Limit { get; set; }

        /// <summary>Slots spent today. Counted even when unlimited, so cost stays attributable.</summary>
        public int Used { get; set; }

        /// <summary>Slots left, or <c>null</c> when unlimited.</summary>
        public int? Remaining { get; set; }

        public DateTime ResetsAt { get; set; }
    }
}
