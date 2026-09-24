namespace QuizAPI.Services.Associations
{
    /// <summary>
    /// The Associations scoring formula — the counterpart of <c>QuizScoring</c>. It holds the
    /// shape of the formula and no numbers: those come from <see cref="AssociationRules"/>.
    ///
    /// <code>
    /// columnValue(c) = ColumnBase + PerClosedTile × (Tiles of c still closed)
    /// solve Column c  → columnValue(c)
    /// solve the Final → FinalBase + Σ columnValue(c) over every Column still unsolved
    /// </code>
    ///
    /// Solving the Final early is worth more because every Column you didn't need goes to you at
    /// its full value, and a Column is worth more the fewer of its Tiles were opened. There is no
    /// time factor: speed is not what this format rewards. See docs/quiz/associations.md, "Scoring".
    /// </summary>
    public static class AssociationScoring
    {
        /// <summary>What solving a Column is worth, given how many of its Tiles are still closed.</summary>
        public static int ColumnValue(AssociationRules rules, int closedTiles)
        {
            if (closedTiles is < 0 or > BoardKey.TilesPerColumn)
                throw new ArgumentOutOfRangeException(nameof(closedTiles));
            return rules.ColumnBase + rules.PerClosedTile * closedTiles;
        }

        /// <summary>What the Final is worth: its base plus the value of every Column it collects.</summary>
        public static int FinalValue(AssociationRules rules, IEnumerable<int> unsolvedColumnValues) =>
            rules.FinalBase + unsolvedColumnValues.Sum();
    }
}
