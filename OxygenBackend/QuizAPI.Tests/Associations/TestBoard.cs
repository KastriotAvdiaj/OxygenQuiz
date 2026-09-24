using QuizAPI.Services.Associations;

namespace QuizAPI.Tests.Associations;

/// <summary>
/// One fixed board for every engine test. Tile ids are laid out so a test can name them without
/// looking them up: Column A is 1–4, B is 5–8, C is 9–12, D is 13–16.
/// </summary>
internal static class TestBoard
{
    public static readonly DateTime T0 = new(2026, 9, 22, 12, 0, 0, DateTimeKind.Utc);

    public static DateTime At(double seconds) => T0.AddSeconds(seconds);

    public static int[] TilesOf(ColumnLetter c) => Enumerable.Range((int)c * 4 + 1, 4).ToArray();

    public static readonly BoardKey Board = new(
        new[]
        {
            new ColumnKey(ColumnLetter.A, TilesOf(ColumnLetter.A), new SolutionKey("Rome", new[] { "Roma" })),
            // Albanian diacritics on purpose: "Dritë" must match "drite", "Çaj" must match "caj".
            new ColumnKey(ColumnLetter.B, TilesOf(ColumnLetter.B), new SolutionKey("Dritë", Array.Empty<string>())),
            new ColumnKey(ColumnLetter.C, TilesOf(ColumnLetter.C), new SolutionKey("Çaj", Array.Empty<string>())),
            new ColumnKey(ColumnLetter.D, TilesOf(ColumnLetter.D), new SolutionKey("Water", Array.Empty<string>())),
        },
        new SolutionKey("Italy", new[] { "Italia" }));

    public static string SolutionOf(GuessTarget t) => t switch
    {
        GuessTarget.A => "Rome",
        GuessTarget.B => "Drite",
        GuessTarget.C => "caj",
        GuessTarget.D => "water",
        _ => "Italy",
    };

    public static readonly AssociationRules Rules = AssociationRules.Default;

    /// <summary>Applies a move that must be accepted, and returns the outcome.</summary>
    public static MoveOutcome Must(AssociationState state, AssociationMove move, AssociationRules? rules = null)
    {
        var outcome = AssociationEngine.Apply(state, Board, rules ?? Rules, move);
        if (!outcome.Accepted)
            throw new Xunit.Sdk.XunitException($"Expected {move.Kind} by seat {move.Seat} to be accepted, got {outcome.Rejection}.");
        return outcome;
    }

    /// <summary>Applies a move that must be refused for <paramref name="why"/>, and checks nothing changed.</summary>
    public static void Refused(AssociationState state, AssociationMove move, MoveRejection why, AssociationRules? rules = null)
    {
        var outcome = AssociationEngine.Apply(state, Board, rules ?? Rules, move);
        Xunit.Assert.Equal(why, outcome.Rejection);
        Xunit.Assert.Same(state, outcome.State);
    }
}
