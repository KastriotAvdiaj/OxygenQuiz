namespace QuizAPI.Services.Associations
{
    /// <summary>
    /// The Associations scoring formula — the counterpart of <c>QuizScoring</c>. It holds the
    /// shape of the formula and no numbers: those come from <see cref="AssociationRules"/>.
    ///
    /// <code>
    /// columnValue(c) = ColumnBase + PerClosedTile × (Tiles of c still closed)
    /// solve Column c  → columnValue(c)
    /// solve the Final → FinalBase + Σ (columnValue(c) + FinalPerCollectedColumn) over every Column still unsolved
    /// </code>
    ///
    /// A Column is worth more the fewer of its Tiles were opened, and a Column the Final collects
    /// is worth more than the same Column solved on its own — by <c>FinalPerCollectedColumn</c>.
    /// That bonus is the whole reason going straight for the Final beats solving the Columns
    /// first: without it both routes add up to the same number. There is no
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

        /// <summary>
        /// What the Final is worth: its base, plus the value of every Column it collects, plus the
        /// bonus for each of those Columns.
        /// </summary>
        public static int FinalValue(AssociationRules rules, IEnumerable<int> unsolvedColumnValues)
        {
            var collected = unsolvedColumnValues.ToList();
            return rules.FinalBase + collected.Sum() + rules.FinalPerCollectedColumn * collected.Count;
        }
    }
}
