using QuizAPI.ManyToManyTables;

namespace QuizAPI.Services.Scoring
{
    /// <summary>
    /// Single source of truth for quiz answer scoring. Both single-player grading
    /// (<c>AnswerGradingService</c>) and live multiplayer matches call this, so a point is worth
    /// the same thing in every mode. Pure and stateless.
    ///
    /// Model: a correct answer earns a base value plus a speed bonus — the more of the question's
    /// time limit you leave on the clock, the bigger the bonus (up to +50% for an instant answer) —
    /// then the question's <see cref="PointSystem"/> multiplier is applied. Wrong / unanswered = 0
    /// (the caller decides correctness; this only computes the value of a correct answer).
    ///
    /// Resolution: <see cref="BasePoints"/> is 1000 (not 10) and rounding happens once, at the very
    /// end, so the speed bonus resolves sub-second differences. On a 30s question, answering 0.1s
    /// faster is worth ~1.7 points; on a 10s question, 5 points. With the old base of 10 the entire
    /// speed range collapsed into six integer buckets (10–15) — one bucket per 6 seconds on a 30s
    /// limit — which made equally-fast competitive answers indistinguishable. Historical scores
    /// recorded on the 10-point scale were rescaled ×100 by the
    /// <c>RescaleScoresToHighResolutionBase</c> migration so old and new sessions stay comparable.
    /// </summary>
    public static class QuizScoring
    {
        public const int BasePoints = 1000;
        public const double MaxTimeBonusFactor = 0.5; // up to +50% for answering instantly

        /// <summary>
        /// Points for a CORRECT answer. <paramref name="timeTaken"/> is measured from the question's
        /// start; <paramref name="timeLimitSeconds"/> is that question's limit (0 or less ⇒ no speed
        /// bonus). Never returns less than 1.
        /// </summary>
        public static int PointsForCorrectAnswer(TimeSpan timeTaken, int timeLimitSeconds, PointSystem pointSystem)
        {
            double timeBonus = 0;
            if (timeTaken.TotalSeconds >= 0 && timeLimitSeconds > 0)
            {
                var timeRemainingSeconds = Math.Max(0, timeLimitSeconds - timeTaken.TotalSeconds);
                timeBonus = (timeRemainingSeconds / timeLimitSeconds) * MaxTimeBonusFactor;
            }

            // Keep full double precision until the single, final rounding step — truncating the
            // base-and-bonus part before applying the multiplier is what caused the old bucketing.
            var rawPoints = BasePoints * (1 + timeBonus) * MultiplierFor(pointSystem);
            return Math.Max(1, (int)Math.Round(rawPoints, MidpointRounding.AwayFromZero));
        }

        /// <summary>The score multiplier a question's point system applies.</summary>
        public static int MultiplierFor(PointSystem pointSystem) => pointSystem switch
        {
            PointSystem.Standard => 1,
            PointSystem.Double => 2,
            PointSystem.Quadruple => 4,
            _ => 1,
        };
    }
}
