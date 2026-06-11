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
    /// </summary>
    public static class QuizScoring
    {
        public const int BasePoints = 10;
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

            var pointsWithTimeBonus = (int)(BasePoints * (1 + timeBonus));
            return Math.Max(1, pointsWithTimeBonus * MultiplierFor(pointSystem));
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
