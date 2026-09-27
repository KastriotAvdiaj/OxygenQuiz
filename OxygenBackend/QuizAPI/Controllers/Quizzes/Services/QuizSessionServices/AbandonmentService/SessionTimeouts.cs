namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService
{
    /// <summary>One question of a session's pinned quiz version, reduced to what the timeouts read.</summary>
    /// <param name="TimeLimitSeconds">The per-question limit.</param>
    /// <param name="HasExplanation">Whether the question carries an explanation.</param>
    public readonly record struct TimedQuestion(int TimeLimitSeconds, bool HasExplanation);

    /// <summary>
    /// The arithmetic behind a session's abandonment deadlines, kept pure so it can be pinned by
    /// tests without a database. <see cref="SessionAbandonmentService"/> fetches the inputs and
    /// applies the result.
    /// </summary>
    public static class SessionTimeouts
    {
        /// <summary>
        /// The time a session may reasonably need: every question's limit, plus per-question slack.
        ///
        /// <para>The slack is <see cref="QuizSessionOptions.QuestionBufferSeconds"/> for every
        /// question, plus <see cref="QuizSessionOptions.ExplanationReadSeconds"/> for each question
        /// with an explanation <b>when the quiz gives instant feedback</b> — the only case where the
        /// explanation is read between questions, while the session's clock keeps running. Summed
        /// per question, so a quiz where only some questions have one gets exactly that much.</para>
        /// </summary>
        public static int ExpectedSeconds(
            IReadOnlyCollection<TimedQuestion> questions, bool instantFeedback, QuizSessionOptions options) =>
            questions.Sum(q =>
                q.TimeLimitSeconds
                + options.QuestionBufferSeconds
                + (instantFeedback && q.HasExplanation ? options.ExplanationReadSeconds : 0));

        public static (TimeSpan TotalTimeout, TimeSpan ActivityTimeout) Calculate(
            IReadOnlyCollection<TimedQuestion> questions, bool instantFeedback, QuizSessionOptions options)
        {
            var expectedDuration = TimeSpan.FromSeconds(ExpectedSeconds(questions, instantFeedback, options));

            var totalTimeout = expectedDuration.Add(
                TimeSpan.FromMinutes(expectedDuration.TotalMinutes * options.TotalTimeoutBufferPercentage));

            // ── The activity timeout must not be able to outrun the catch-up walk ──────────────
            //
            // `ResolveAndResumeAsync` checks abandonment FIRST, and only then walks the expired
            // questions. So any absence this timeout calls "abandoned" is an absence the walk
            // never gets to resolve — and if that absence is shorter than the walk's own reach,
            // the walk is unreachable and the "Session In Progress" screen is offering a resume
            // the server will refuse.
            //
            // The walk's reach is bounded by the total playable time of the session's unanswered
            // questions, which is at most every visible question's limit. Setting the timeout to
            // the whole quiz's expected time plus a grace therefore guarantees the invariant:
            //
            //     activityTimeout > (the longest catch-up the walk could ever perform)
            //
            // so abandonment can only fire once the walk would have run out of questions anyway.
            // Using every question rather than just the unanswered ones over-estimates late in a
            // quiz, and that is the deliberate direction: too generous costs a stale row the
            // total-time cap reaps anyway, too tight costs a player their session. The reading
            // allowance only ever adds to it, which keeps that direction.
            //
            // It used to be `longestQuestion * 2 + 60s` — two minutes for a quiz of 30-second
            // questions, which voided any absence long enough to expire three questions. The
            // catch-up walk, its client-side mirror and the whole resume screen were dead code in
            // production. See docs/adr/0008-abandonment-cannot-outrun-the-catch-up-walk.md.
            var activityTimeout = questions.Count > 0
                ? expectedDuration + TimeSpan.FromSeconds(options.ActivityBufferSeconds)
                : TimeSpan.FromSeconds(options.FallbackActivityTimeoutSeconds);

            return (totalTimeout, activityTimeout);
        }
    }
}
