using QuizAPI.DTOs.Question;
using QuizAPI.Models.Quiz;
using QuizAPI.Models;
using System.Text.Json.Serialization;

namespace QuizAPI.DTOs.Quiz
{
        public enum LiveQuizStatus
        {
            InProgress,   
            BetweenQuestions,
            Completed        
        }

        /// <summary>
        /// Represents the live state of a quiz session, used for state recovery (e.g., on page refresh).
        /// </summary>
        public class QuizStateDto
        {
            public LiveQuizStatus Status { get; set; }

            /// <summary>
            /// If the status is InProgress, this will contain the details of the active question.
            /// Will be null otherwise.
            /// </summary>
            public CurrentQuestionDto? ActiveQuestion { get; set; }
        }

        /// <summary>
        /// The result of resolving and resuming a quiz session.
        /// Contains the resolved state after auto-timing-out any expired questions.
        /// </summary>
        public class ResumeResultDto
        {
            public QuizSessionDto Session { get; set; } = null!;

            /// <summary>
            /// The question the user should resume on. Null if the quiz is complete.
            /// </summary>
            public CurrentQuestionDto? ActiveQuestion { get; set; }

            /// <summary>
            /// The 1-based question number the user is on (e.g., 3 = third question).
            /// </summary>
            public int QuestionNumber { get; set; }

            /// <summary>
            /// True if all remaining questions timed out and the quiz auto-completed.
            /// </summary>
            public bool IsQuizComplete { get; set; }

            /// <summary>
            /// How many questions were auto-marked as TimedOut during the catch-up.
            /// </summary>
            public int SkippedCount { get; set; }
        }

    public class QuizSessionCM
        {
            public int QuizId { get; set; }
            public Guid UserId { get; set; }

            /// <summary>
            /// Required to start a session for an Unlisted quiz you don't own — it's the access grant
            /// from the share link. Ignored for Public quizzes and for quizzes you own.
            /// </summary>
            public string? ShareToken { get; set; }
        }

        public class GuestQuizSessionCM
        {
            public int QuizId { get; set; }
        }

        public class ResumeRequestDto
        {
            public Guid UserId { get; set; }
        }

        public class UserAnswerCM
        {
            public Guid SessionId { get; set; }
            public int QuizQuestionId { get; set; }
            public int? SelectedOptionId { get; set; }
            public string? SubmittedAnswer { get; set; }
            /// <summary>
            /// Set to true by the frontend when the client-side timer expired.
            /// The backend uses this alongside its own server-side clock check
            /// to reliably determine timeouts regardless of network latency.
            /// </summary>
            public bool IsTimedOut { get; set; } = false;

            /// <summary>
            /// Client-measured think time in milliseconds: question rendered → answer submitted,
            /// taken from a monotonic clock (<c>performance.now()</c>). Used only for SCORING —
            /// after server-side validation against the server's own window (see
            /// <c>Services/Scoring/QuizTiming</c>) — so a player's ping doesn't eat their speed
            /// bonus. Timeout enforcement never trusts this value. Null (older clients) means
            /// scoring falls back to the server-measured window.
            /// </summary>
            public long? ClientElapsedMs { get; set; }
        }

        // Data Transfer Objects
        public class QuizSessionDto
        {
            public Guid Id { get; set; }
            public int QuizId { get; set; }
            public string QuizTitle { get; set; } = string.Empty;
            public Guid UserId { get; set; }
            public DateTime StartTime { get; set; }
            public DateTime? EndTime { get; set; }
            public int TotalScore { get; set; }
            public bool IsCompleted { get; set; }
            public List<UserAnswerDto> UserAnswers { get; set; } = new();
            public AbandonmentReason? AbandonmentReason { get; set; }
            public DateTime? AbandonedAt { get; set; }

            public bool HasInstantFeedback { get; set; }
            public int TotalQuestions { get; set; }
            public string? QuizDescription { get; set; }
            public string? Category{ get; set; }

            /// <summary>
            /// The still-running clock of an unfinished session. Null once the session is
            /// completed — there is nothing left to count down. See
            /// <see cref="SessionResumeStateDto"/>.
            /// </summary>
            public SessionResumeStateDto? ResumeState { get; set; }
    }

        /// <summary>
        /// Everything a client needs to predict what
        /// <c>QuizSessionService.ResolveAndResumeAsync</c> would do right now, without asking.
        /// The "Session In Progress" screen replays that catch-up locally once a second, so a
        /// player looking at it watches the question they abandoned run out instead of reading a
        /// snapshot that was already stale when it arrived
        /// (docs/quiz/session-resume-screen.md).
        ///
        /// It is a PREDICTION, never an authority: the server redoes the whole walk on
        /// resolve-and-resume and its answer is the one that counts.
        /// </summary>
        public class SessionResumeStateDto
        {
            /// <summary>
            /// The server's clock at the moment this DTO was built. The client subtracts its own
            /// <c>Date.now()</c> to get an offset and corrects with it, for the same reason
            /// multiplayer measures skew every round: a device whose clock has drifted a few
            /// seconds would otherwise be shown free time, or time it no longer has
            /// (docs/quiz/quiz-timer.md §Clock skew).
            ///
            /// Stamped by the property initializer rather than the EF projection on purpose —
            /// "now" is a client-side value either way, and putting <c>DateTime.UtcNow</c> inside
            /// an expression tree makes it a provider-translation question it does not need to be.
            /// </summary>
            public DateTime ServerTimeUtc { get; set; } = DateTime.UtcNow;

            /// <summary>The question the player was last served, if one is in flight.</summary>
            public int? CurrentQuizQuestionId { get; set; }

            /// <summary>
            /// When that question was served. Null means no clock is running — a session created
            /// but never served a question resumes on its first question with the full limit, and
            /// the screen shows no countdown.
            /// </summary>
            public DateTime? CurrentQuestionStartTime { get; set; }

            /// <summary>
            /// Every unanswered question of the session's pinned quiz version, in play order.
            /// Ids and time limits only — no text, options or answers, so this leaks nothing the
            /// player could not already get by resuming. The client burns overflow seconds through
            /// these limits exactly as step 2 of <c>ResolveAndResumeAsync</c> does.
            /// </summary>
            public List<PendingQuestionDto> PendingQuestions { get; set; } = new();

            /// <summary>
            /// When this session stops being resumable at all — <c>ISessionAbandonmentService
            /// .GetAbandonmentDeadlineAsync</c>, the same number the server tests itself against.
            ///
            /// <para><b>Why the client needs it.</b> The resume screen replays the catch-up walk
            /// locally so its clock keeps running (<c>resume-projection.ts</c>), but the walk is
            /// only the second half of what resume does: the abandonment check runs before it. A
            /// screen that models the walk alone will happily promise "resume within 26s and you
            /// keep it" for a session the server has already written off — which is what it did
            /// until 2026-09-10. With the deadline on the wire the screen can stop offering a
            /// resume that cannot succeed.</para>
            ///
            /// <para>Null only when it could not be computed (no such session). It is deliberately
            /// NOT populated on every read: the resume screen is fed by
            /// <c>GET /quizsessions/{id}</c>, and computing it costs an aggregate query that
            /// answer submission has no use for.</para>
            /// </summary>
            public DateTime? AbandonmentDeadline { get; set; }
        }

        /// <summary>One unanswered question, reduced to what the catch-up walk reads.</summary>
        public class PendingQuestionDto
        {
            public int QuizQuestionId { get; set; }
            public int TimeLimitInSeconds { get; set; }
        }

        public class UserAnswerDto
        {
        public int Id { get; set; }
        public AnswerStatus Status { get; set; }
        public int Score { get; set; }

        public int? SelectedOptionId { get; set; } // For MC/T-F questions
        public string? SubmittedAnswer { get; set; }

        // --- Question Context ---
        public string QuestionText { get; set; } = string.Empty;
        public string? MediaUrl { get; set; }
        public string MediaType { get; set; } = "None";
        [JsonConverter(typeof(JsonStringEnumConverter))] // Ensures the enum is sent as a string
        public QuestionType QuestionType { get; set; }
        public int TimeLimitInSeconds { get; set; }
        public double? TimeSpentInSeconds { get; set; } // Calculated field

        /// <summary>
        /// For MultipleChoice questions: A list of all available options, including correctness.
        /// </summary>
        public List<AnswerOptionDTO>? AnswerOptions { get; set; }

        /// <summary>
        /// For TrueFalse questions: The correct boolean answer.
        /// </summary>
        public bool? CorrectAnswerBoolean { get; set; }

        /// <summary>
        /// For TypeTheAnswer questions: The primary correct answer string.
        /// </summary>
        public string? CorrectAnswerText { get; set; }

        /// <summary>
        /// For TypeTheAnswer questions: A list of all other acceptable answers.
        /// </summary>
        public List<string>? AcceptableAnswers { get; set; }
    }

    public class CurrentQuestionDto
    {
        
        public int QuizQuestionId { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public string? MediaUrl { get; set; }
        public string MediaType { get; set; } = "None";
        public List<AnswerOptionForQuizPlaying> Options { get; set; } = new();
        public int TimeLimitInSeconds { get; set; }
        public int TimeRemainingInSeconds { get; set; }
        public required string QuestionType { get; set; }

        /// <summary>
        /// True for multiple-choice questions that accept more than one correct option.
        /// The client renders checkboxes + a "select all that apply" hint and submits the
        /// chosen option ids as a comma-separated list in <c>SubmittedAnswer</c>.
        /// </summary>
        public bool AllowMultipleSelections { get; set; }
    }

    public class QuizSessionSummaryDto
        {
            public Guid Id { get; set; }
            public int QuizId { get; set; }
            public string QuizTitle { get; set; } = string.Empty;
            public DateTime StartTime { get; set; }
            public DateTime? EndTime { get; set; }
            public int TotalScore { get; set; }
            public int TotalQuestions { get; set; }
            public int CorrectAnswers { get; set; }
            public bool IsCompleted { get; set; }
            public TimeSpan? Duration { get; set; }
            public AbandonmentReason? AbandonmentReason { get; set; }
            public DateTime? AbandonedAt { get; set; }
    }

    public class AnswerResultDto
    {
        /// <summary>
        /// The outcome of the answer submission (e.g., Correct, Incorrect, TimedOut).
        /// </summary>
        public AnswerStatus Status { get; set; }

        /// <summary>
        /// The score awarded for this specific answer. Will be 0 if incorrect or timed out.
        /// </summary>
        public int ScoreAwarded { get; set; }

        /// <summary>
        /// A flag indicating whether this was the last question in the quiz.
        /// The client uses this to know whether to enable a "Next Question" button
        /// or navigate to the final results screen.
        /// </summary>
        public bool IsQuizComplete { get; set; }
    }

    public class InstantFeedbackAnswerResultDto
    {
        /// <summary>
        /// The outcome of the answer submission (e.g., Correct, Incorrect, TimedOut).
        /// </summary>
        public AnswerStatus Status { get; set; }

        /// <summary>
        /// The score awarded for this specific answer. Will be 0 if incorrect or timed out.
        /// </summary>
        public int ScoreAwarded { get; set; }

        /// <summary>
        /// A flag indicating whether this was the last question in the quiz.
        /// </summary>
        public bool IsQuizComplete { get; set; }

        /// <summary>
        /// For Multiple Choice questions: The ID of the correct option.
        /// Only provided when instant feedback is enabled and answer was incorrect/timed out.
        /// </summary>
        public int? CorrectOptionId { get; set; }

        /// <summary>
        /// For True/False questions: The correct answer ("True" or "False").
        /// For TypeTheAnswer questions: The primary correct answer.
        /// Only provided when instant feedback is enabled and answer was incorrect/timed out.
        /// </summary>
        public string? CorrectAnswer { get; set; }

        /// <summary>
        /// For TypeTheAnswer questions: Alternative acceptable answers.
        /// Only provided when instant feedback is enabled and answer was incorrect/timed out.
        /// </summary>
        public List<string>? AcceptableAnswers { get; set; }

        /// <summary>
        /// For multiple-choice questions that allow multiple selections: the full set of correct
        /// option ids (so the client can highlight every correct option). For single-answer
        /// questions <see cref="CorrectOptionId"/> is used instead.
        /// </summary>
        public List<int>? CorrectOptionIds { get; set; }

        /// <summary>
        /// Time spent on the question in seconds.
        /// </summary>
        public double TimeSpentInSeconds { get; set; }
    }

}
