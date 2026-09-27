namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public class QuizSessionOptions
    {
        public const string SectionName = "QuizSession";

        public double GracePeriodSeconds { get; set; } = 0;
        /// <summary>
        /// Slack per question in the session's total-time deadline: network latency, page loads,
        /// and the three-second auto-advance after instant feedback. Global — every question of
        /// every quiz gets it.
        /// </summary>
        public int QuestionBufferSeconds { get; set; } = 5;

        /// <summary>
        /// Extra slack for each question that has an explanation, in a quiz with instant feedback —
        /// the only case where the player is shown it between questions. It is also the
        /// <b>longest the client will wait</b> before auto-advancing past an explanation: sent as
        /// <c>InstantFeedbackAnswerResultDto.ReadingAllowanceSeconds</c>, so the client's wait can
        /// never exceed what the deadline allows for. Raise it and both move together.
        ///
        /// <para>Per question rather than a bigger <see cref="QuestionBufferSeconds"/>, so a quiz
        /// without explanations — or with only some — isn't given slack it will never use. See
        /// docs/quiz/session-lifecycle.md, "The timing rules".</para>
        /// </summary>
        public int ExplanationReadSeconds { get; set; } = 10;
        public double TotalTimeoutBufferPercentage { get; set; } = 0.5;

        /// <summary>
        /// Grace added on top of the whole quiz's playable time to get the <b>activity</b>
        /// timeout — how long a session may sit untouched before it is considered abandoned.
        ///
        /// <para><b>This is not a free parameter.</b> The activity timeout has to be at least as
        /// long as the longest catch-up <c>ResolveAndResumeAsync</c> could perform, or the
        /// abandonment check (which runs first) voids sessions the catch-up would have resumed
        /// perfectly well — which is exactly what it did until 2026-09-10. See
        /// <c>SessionAbandonmentService.CalculateTimeoutsAsync</c> and
        /// docs/adr/0008-abandonment-cannot-outrun-the-catch-up-walk.md before changing it.</para>
        /// </summary>
        public int ActivityBufferSeconds { get; set; } = 60;

        /// <summary>
        /// Activity timeout for a session whose pinned quiz version has no visible questions at
        /// all — a quiz whose entire question set was removed by a later version. There is no
        /// playable time to derive a timeout from, and voiding such a session on the next sweep
        /// would be a surprising way to find out, so it gets a flat window instead.
        /// </summary>
        public int FallbackActivityTimeoutSeconds { get; set; } = 300;

        public int MaxConcurrentSessionsPerUser { get; set; } = 1;

        /// <summary>
        /// How often the background sweep looks for sessions that have gone stale. Set to 0 (or
        /// less) to disable the sweep entirely, which leaves abandonment happening only on the
        /// lazy paths — when the player comes back to the quiz, or on resume.
        ///
        /// Five minutes rather than something tighter because nothing is waiting on the result:
        /// a session that went stale is stale whether it is marked now or in four minutes, and
        /// the sweep walks every incomplete session each pass.
        /// </summary>
        public int AbandonmentSweepMinutes { get; set; } = 5;

        /// <summary>
        /// Ceiling on how much network latency the server will credit back when a client reports
        /// its own think time (<c>UserAnswerCM.ClientElapsedMs</c>). A client-reported elapsed is
        /// only believed when the server-measured window exceeds it by at most this many seconds;
        /// otherwise scoring falls back to the server window. See <c>Services/Scoring/QuizTiming</c>.
        /// </summary>
        public double MaxLatencyCreditSeconds { get; set; } = 2.0;
    }
}
