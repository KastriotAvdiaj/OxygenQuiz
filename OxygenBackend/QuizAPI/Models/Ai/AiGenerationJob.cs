using System.ComponentModel.DataAnnotations;

namespace QuizAPI.Models.Ai
{
    public enum AiGenerationJobStatus
    {
        /// <summary>Accepted, not started yet.</summary>
        Queued = 0,

        /// <summary>Being written. <see cref="AiGenerationJob.Stage"/> says how far along.</summary>
        Running = 1,

        /// <summary>The questions are in <see cref="AiGenerationJob.ResultJson"/>.</summary>
        Succeeded = 2,

        /// <summary>It ended without questions; <see cref="AiGenerationJob.ResultJson"/> holds the error body.</summary>
        Failed = 3,

        /// <summary>
        /// Grounding needs the author — a language, an article, or what to do about an outage
        /// (docs/quiz/ai-quiz-generation-flow.md §2e). Nothing was spent. The error body holds the
        /// question, exactly as the synchronous endpoint's 409 does.
        /// </summary>
        NeedsChoice = 4,
    }

    /// <summary>
    /// One generation running on the server rather than inside a held-open request
    /// (docs/quiz/ai-quiz-generation-flow.md §3c, ADR 0046).
    ///
    /// <para><b>Not the ledger.</b> <see cref="AiGenerationUsage"/> is what was spent and is kept;
    /// this is the work in progress and its answer, kept only until the author has collected it
    /// (and swept after a week either way). The two are not linked by key: a job that asks a
    /// question never reserves a slot, and one generation can be several model calls.</para>
    /// </summary>
    public class AiGenerationJob
    {
        [Key]
        public Guid Id { get; set; }

        public Guid UserId { get; set; }

        public AiGenerationJobStatus Status { get; set; }

        /// <summary>One of <c>AiGenerationStages</c>. What the progress card shows — a real step, not a timer.</summary>
        [MaxLength(30)]
        public string Stage { get; set; } = string.Empty;

        /// <summary>For the notification's wording. Never used to rebuild the request.</summary>
        [MaxLength(200)]
        public string? Topic { get; set; }

        /// <summary>The request body as it was posted (<c>AiGenerateCM</c>), for the worker.</summary>
        public string RequestJson { get; set; } = string.Empty;

        /// <summary>
        /// The body the synchronous endpoint would have answered with: an <c>AiGenerateResponse</c>
        /// on success, an <c>AiGenerateErrorResponse</c> otherwise. Stored whole so a job read
        /// later is handled by the same client code as a live reply.
        /// </summary>
        public string? ResultJson { get; set; }

        /// <summary>
        /// Where in the app the author started it — a path, checked when the job is created. The
        /// notification links back there, since the wizard lives under two dashboards.
        /// </summary>
        [MaxLength(200)]
        public string? ReturnPath { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? CompletedAt { get; set; }

        /// <summary>
        /// When the author's browser took the result. Until then the job is "theirs to collect":
        /// the wizard picks it up on open, and a notification is sent if nobody was watching.
        /// </summary>
        public DateTime? SeenAt { get; set; }

        /// <summary>So the "nobody collected it" check can't notify twice.</summary>
        public bool Notified { get; set; }
    }
}
