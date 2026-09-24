using QuizAPI.Services.Associations;
using Xunit;
using static QuizAPI.Tests.Associations.TestBoard;

namespace QuizAPI.Tests.Associations;

/// <summary>
/// The worked examples in docs/quiz/associations.md ("Scoring"), played through the engine — the
/// formula is only worth testing as players meet it. Each also runs under non-default rules, which
/// is what proves the numbers are settings and not literals.
/// </summary>
public class AssociationScoringTests
{
    private static readonly AssociationRules Custom = new() { ColumnBase = 7, PerClosedTile = 2, FinalBase = 20 };

    [Fact]
    public void ColumnValue_IsBasePlusEachClosedTile()
    {
        Assert.Equal(9, AssociationScoring.ColumnValue(Rules, 4));
        Assert.Equal(5, AssociationScoring.ColumnValue(Rules, 0));
        Assert.Equal(7 + 2 * 3, AssociationScoring.ColumnValue(Custom, 3));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(5)]
    public void ColumnValue_RefusesAnImpossibleTileCount(int closed) =>
        Assert.Throws<ArgumentOutOfRangeException>(() => AssociationScoring.ColumnValue(Rules, closed));

    /// <summary>One tile opened (in A), then the Final: 10 + (5+3) + 3×(5+4) = 45, the maximum.</summary>
    [Fact]
    public void FinalAfterOneTile_ScoresTheMaximum()
    {
        var s = AssociationEngine.StartSolo(T0, 240);
        s = Must(s, AssociationMove.Open(0, 1, At(1))).State;
        var final = Must(s, AssociationMove.Guess(0, GuessTarget.Final, "Italy", At(2)));

        Assert.Equal(45, final.Points);
        Assert.Equal(45, final.State.Scores[0]);
        Assert.Equal(new[] { ColumnLetter.A, ColumnLetter.B, ColumnLetter.C, ColumnLetter.D }, final.SolvedColumns);
    }

    [Fact]
    public void FinalAfterOneTile_UnderCustomRules()
    {
        var s = AssociationEngine.StartSolo(T0, 240);
        s = Must(s, AssociationMove.Open(0, 1, At(1)), Custom).State;
        var final = Must(s, AssociationMove.Guess(0, GuessTarget.Final, "Italy", At(2)), Custom);

        // 20 + (7 + 2×3) + 3 × (7 + 2×4)
        Assert.Equal(20 + 13 + 3 * 15, final.Points);
    }

    /// <summary>
    /// A and B solved; C has one Tile open, D none. Final: 10 + (5+3) + (5+4) = 27. The collected
    /// Columns are counted once, inside the Final's points.
    /// </summary>
    [Fact]
    public void FinalWithTwoColumnsUnsolved_Scores27()
    {
        var s = AssociationEngine.StartSolo(T0, 240);
        s = Must(s, AssociationMove.Open(0, 1, At(1))).State;
        s = Must(s, AssociationMove.Open(0, 2, At(2))).State;
        var a = Must(s, AssociationMove.Guess(0, GuessTarget.A, "Rome", At(3)));
        Assert.Equal(5 + 2, a.Points);
        s = a.State;
        s = Must(s, AssociationMove.Open(0, 5, At(4))).State;
        var b = Must(s, AssociationMove.Guess(0, GuessTarget.B, "drite", At(5)));
        Assert.Equal(5 + 3, b.Points);
        s = b.State;
        s = Must(s, AssociationMove.Open(0, 9, At(6))).State;

        var final = Must(s, AssociationMove.Guess(0, GuessTarget.Final, "italia", At(7)));

        Assert.Equal(27, final.Points);
        Assert.Equal(7 + 8 + 27, final.State.Scores[0]);
        Assert.Equal(new[] { ColumnLetter.C, ColumnLetter.D }, final.SolvedColumns);
        Assert.True(final.State.SolvedColumns[ColumnLetter.C].ViaFinal);
        Assert.Equal(8, final.State.SolvedColumns[ColumnLetter.C].Points);
    }

    /// <summary>Every Column already solved: the Final is worth its base and nothing more.</summary>
    [Fact]
    public void FinalWithEverythingSolved_ScoresItsBaseOnly()
    {
        // One Tile opened (A1) earns the first Guess; each correct Guess earns the next.
        var s = Must(AssociationEngine.StartSolo(T0, 240), AssociationMove.Open(0, 1, At(0.5))).State;
        foreach (var t in new[] { GuessTarget.A, GuessTarget.B, GuessTarget.C, GuessTarget.D })
            s = Must(s, AssociationMove.Guess(0, t, SolutionOf(t), At(1))).State;

        var final = Must(s, AssociationMove.Guess(0, GuessTarget.Final, "Italy", At(2)));

        Assert.Equal(10, final.Points);
        Assert.Empty(final.SolvedColumns);
        Assert.Equal(8 + 3 * 9 + 10, final.State.Scores[0]);
    }

    /// <summary>
    /// A Column guessed with none of its own Tiles open is worth the most a Column can be — the
    /// Tile that earned the Guess was another Column's.
    /// </summary>
    [Fact]
    public void ColumnGuessedBlind_ScoresNine()
    {
        var s = Must(AssociationEngine.StartSolo(T0, 240), AssociationMove.Open(0, 1, At(0.5))).State;
        Assert.Equal(9, Must(s, AssociationMove.Guess(0, GuessTarget.D, "Water", At(1))).Points);
    }
}
