using System.ComponentModel.DataAnnotations;
using QuizAPI.Services.Ai;

namespace QuizAPI.Models.Ai
{
    /// <summary>
    /// One row per generation attempt. Serves three jobs at once, which is why it exists rather
    /// than a plain counter:
    ///
    ///  1. <b>Quota.</b> A row in <see cref="AiGenerationStatus.Reserved"/> or
    ///     <see cref="AiGenerationStatus.Succeeded"/> occupies one of the user's daily slots.
    ///     Reserving before calling the provider is what makes concurrent requests safe —
    ///     see docs/quiz/ai-quiz-generation-flow.md §4.
    ///  2. <b>Cost.</b> Token counts and a priced estimate, so "what does this feature cost"
    ///     is a query rather than a guess, and so the rolling budget cap has something to sum.
    ///  3. <b>Quality.</b> Requested vs returned question counts, and the error code when it
    ///     failed, make model regressions visible without extra instrumentation.
    ///
    /// The source material itself is never stored — only a hash of it. Uploaded documents are
    /// extracted in memory and discarded (plan §7.2).
    /// </summary>
    public class AiGenerationUsage
    {
        [Key]
        public Guid Id { get; set; }

        /// <summary>
        /// The user who spent the slot. No FK on purpose, matching <see cref="AuditLog"/>: cost
        /// history should survive the user being deleted.
        /// </summary>
        public Guid UserId { get; set; }

        public AiGenerationStatus Status { get; set; }

        public AiGenerationMode Mode { get; set; }

        /// <summary>Topic mode only. Kept for debugging quality complaints ("this quiz was wrong").</summary>
        [MaxLength(200)]
        public string? Topic { get; set; }

        /// <summary>
        /// SHA-256 of the exact prompt inputs. Doubles as the response-cache key once caching
        /// lands (plan §9.5), which is why it hashes the options and not just the source text.
        /// </summary>
        [MaxLength(64)]
        public string? RequestHash { get; set; }

        /// <summary>Characters of source material after extraction and truncation. 0 in topic mode.</summary>
        public int SourceChars { get; set; }

        public int QuestionsRequested { get; set; }

        /// <summary>
        /// Questions in the model's reply. Less than requested is accepted, not an error — but
        /// a persistent gap is the signal that the prompt or the model needs attention.
        /// </summary>
        public int QuestionsReturned { get; set; }

        /// <summary>Model id at the time of the call, so a provider switch is visible in the data.</summary>
        [MaxLength(100)]
        public string? Model { get; set; }

        public int InputTokens { get; set; }
        public int OutputTokens { get; set; }

        /// <summary>
        /// Priced at commit time from <see cref="AiOptions"/>, deliberately at the cache-miss
        /// rate so it is an upper bound. Frozen on the row: a later price change must not
        /// silently rewrite what past months appear to have cost.
        /// </summary>
        public decimal EstimatedCostUsd { get; set; }

        /// <summary>One of <see cref="AiErrorCodes"/> when the attempt failed.</summary>
        [MaxLength(50)]
        public string? ErrorCode { get; set; }

        public DateTime CreatedAt { get; set; }

        /// <summary>Set when the row leaves <see cref="AiGenerationStatus.Reserved"/>.</summary>
        public DateTime? CompletedAt { get; set; }
    }
}
