namespace QuizAPI.Services.Scoring
{
    /// <summary>
    /// Single source of truth for deciding which elapsed time an answer is SCORED with.
    /// Shared by single-player (<c>SubmitAnswerService</c>) and multiplayer
    /// (<c>MatchOrchestrator</c>) so latency compensation works identically in both modes.
    ///
    /// <para><b>Why this exists.</b> The server can only measure elapsed time between two
    /// server-side moments: when it served the question and when the answer request arrived.
    /// That window contains a full network round trip, so a player on a 200ms connection loses
    /// ~0.4s of speed bonus on every question through no fault of their own — larger than the
    /// sub-second differences <see cref="QuizScoring"/> now resolves. The client, however, can
    /// measure the true think time exactly (question rendered → answer clicked) with a monotonic
    /// clock (<c>performance.now()</c>), which no clock skew can distort. We therefore let the
    /// client REPORT its elapsed time and let the server VALIDATE it against the only bound it
    /// can prove: the server-side window.</para>
    ///
    /// <para><b>Trust model.</b> The client-reported value is accepted only when all hold:
    /// it is positive; it does not exceed the server-measured window (physically impossible for
    /// an honest client, since the server window strictly contains the client window); and the
    /// gap between the two (≈ round trip + render time) is within <c>maxLatencyCredit</c>. A
    /// tampered client can therefore steal at most the credit an honest client on a slow
    /// connection would legitimately receive — capped, bounded, and worth only a few points.
    /// Anything outside those bounds falls back to the server window, which is exactly the
    /// pre-compensation behaviour. Timeout enforcement deliberately stays on the server clock
    /// (see <c>SubmitAnswerService.CalculateTimeContext</c>): this helper only affects scoring.</para>
    /// </summary>
    public static class QuizTiming
    {
        /// <summary>
        /// Default ceiling for how much latency the server is willing to credit back to the
        /// player. Generous enough for a bad mobile round trip + render; small enough that a
        /// dishonest report is worth almost nothing.
        /// </summary>
        public static readonly TimeSpan DefaultMaxLatencyCredit = TimeSpan.FromSeconds(2);

        /// <summary>
        /// Picks the elapsed time an answer should be scored with.
        /// </summary>
        /// <param name="serverElapsed">Server-measured window: question served → answer received.</param>
        /// <param name="clientElapsedMs">Client-measured think time in milliseconds (question
        /// rendered → answer submitted), or null when the client didn't report one.</param>
        /// <param name="maxLatencyCredit">Upper bound on <c>serverElapsed - clientElapsed</c> for
        /// the client value to be believed.</param>
        /// <returns>The validated client elapsed time, or <paramref name="serverElapsed"/> when
        /// the client value is missing or fails validation.</returns>
        public static TimeSpan EffectiveElapsed(
            TimeSpan serverElapsed,
            long? clientElapsedMs,
            TimeSpan? maxLatencyCredit = null)
        {
            if (clientElapsedMs is not { } ms || ms <= 0)
                return serverElapsed;

            var clientElapsed = TimeSpan.FromMilliseconds(ms);
            var credit = maxLatencyCredit ?? DefaultMaxLatencyCredit;

            // An honest client's window is strictly inside the server's window, so a report
            // exceeding it is impossible — reject. A report that undercuts the server window by
            // more than the plausible round-trip ceiling is either a hacked client or a broken
            // measurement — reject both the same way: fall back to the server-side measurement.
            var isPlausible = clientElapsed <= serverElapsed
                              && serverElapsed - clientElapsed <= credit;

            return isPlausible ? clientElapsed : serverElapsed;
        }
    }
}
