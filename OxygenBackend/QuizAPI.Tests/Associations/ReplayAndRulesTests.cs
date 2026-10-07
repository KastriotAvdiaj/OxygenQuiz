using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using QuizAPI.Services.Associations;
using Xunit;
using static QuizAPI.Tests.Associations.TestBoard;

namespace QuizAPI.Tests.Associations;

/// <summary>
/// The move log is the source of truth and state is rebuilt by replay, so replay has to be exact and
/// has to use the rules the game was played under — not whatever is configured today.
/// </summary>
public class ReplayAndRulesTests
{
    private static readonly AssociationMove[] DuelLog =
    {
        AssociationMove.Open(0, 1, At(1)),
        AssociationMove.Guess(0, GuessTarget.A, "Rome", At(2)),
        AssociationMove.Guess(0, GuessTarget.B, "wrong", At(3)),
        AssociationMove.Open(1, 5, At(4)),
        AssociationMove.Guess(1, GuessTarget.B, "Drite", At(5)),
        AssociationMove.Pass(1, At(6)),
        AssociationMove.Open(0, 9, At(7)),
        AssociationMove.Guess(0, GuessTarget.Final, "Italy", At(8)),
    };

    [Fact]
    public void Replay_GivesTheSameStateAsPlayingMoveByMove()
    {
        var live = AssociationEngine.StartDuel(T0, 2, 0);
        foreach (var move in DuelLog) live = Must(live, move).State;

        var replayed = AssociationEngine.Replay(AssociationEngine.StartDuel(T0, 2, 0), Board, Rules, DuelLog);

        Assert.Equal(live.Scores.ToArray(), replayed.Scores.ToArray());
        Assert.Equal(live.OpenTiles.OrderBy(x => x), replayed.OpenTiles.OrderBy(x => x));
        Assert.Equal(live.SolvedColumns.OrderBy(kv => kv.Key), replayed.SolvedColumns.OrderBy(kv => kv.Key));
        Assert.Equal(live.EndReason, replayed.EndReason);
        Assert.Equal(DuelLog.Length, replayed.MoveCount);
        // Seat 0: A (5+3) + Final 10 + C (5+3) + D (5+4) = 8 + 27; seat 1: B (5+3).
        Assert.Equal(new[] { 35, 8 }, replayed.Scores);
    }

    [Fact]
    public void Replay_IsDeterministic()
    {
        var a = AssociationEngine.Replay(AssociationEngine.StartDuel(T0, 2, 0), Board, Rules, DuelLog);
        var b = AssociationEngine.Replay(AssociationEngine.StartDuel(T0, 2, 0), Board, Rules, DuelLog);
        Assert.Equal(a.Scores.ToArray(), b.Scores.ToArray());
        Assert.Equal(a.FinalPoints, b.FinalPoints);
    }

    /// <summary>
    /// The reason games snapshot their rules: the same log under changed scoring gives a different
    /// score. Replay must be handed the snapshot, or history rewrites itself.
    /// </summary>
    [Fact]
    public void Replay_UnderDifferentRules_GivesDifferentScores_SoTheSnapshotMatters()
    {
        var played = Rules;
        var snapshot = AssociationRules.FromJson(played.ToJson());
        var changedSince = Rules with { FinalBase = 12 };

        var withSnapshot = AssociationEngine.Replay(AssociationEngine.StartDuel(T0, 2, 0), Board, snapshot, DuelLog);
        var withToday = AssociationEngine.Replay(AssociationEngine.StartDuel(T0, 2, 0), Board, changedSince, DuelLog);

        Assert.Equal(new[] { 35, 8 }, withSnapshot.Scores);
        Assert.Equal(new[] { 37, 8 }, withToday.Scores);
    }

    [Fact]
    public void Replay_ThrowsOnACorruptLog_RatherThanSkippingTheMove()
    {
        var corrupt = new[] { AssociationMove.Open(0, 1, At(1)), AssociationMove.Open(0, 2, At(2)) };
        var ex = Assert.Throws<InvalidOperationException>(() =>
            AssociationEngine.Replay(AssociationEngine.StartDuel(T0, 2, 0), Board, Rules, corrupt));
        Assert.Contains("Move 2", ex.Message);
    }

    [Fact]
    public void Replay_ReappliesAServerDecidedEnding()
    {
        var log = new[] { AssociationMove.Open(0, 1, At(1)) };
        var s = AssociationEngine.Replay(AssociationEngine.StartSolo(T0, 60), Board, Rules, log, GameEndReason.TimeUp);
        Assert.Equal(GameEndReason.TimeUp, s.EndReason);
    }

    // ── Rules ───────────────────────────────────────────────────────────

    [Fact]
    public void TheDefaults_AreTheDocumentedOnes()
    {
        var d = AssociationRules.Default;
        Assert.Equal((5, 1, 10, 30, 2, 240, 60, 1800),
            (d.ColumnBase, d.PerClosedTile, d.FinalBase, d.DuelTurnSeconds, d.EndgameTurnsPerSeat,
             d.SoloDefaultBoardSeconds, d.SoloMinBoardSeconds, d.SoloMaxBoardSeconds));
        Assert.Empty(d.Validate());
    }

    [Fact]
    public void ASnapshot_RoundTrips()
    {
        var custom = new AssociationRules { ColumnBase = 6, EndgameTurnsPerSeat = 3, DuelTurnSeconds = 45 };
        Assert.Equal(custom, AssociationRules.FromJson(custom.ToJson()));
    }

    /// <summary>A snapshot written before a setting existed replays with that setting's default.</summary>
    [Fact]
    public void AnOldSnapshot_MissingASetting_TakesItsDefault()
    {
        var rules = AssociationRules.FromJson("""{"ColumnBase":5,"PerClosedTile":1,"FinalBase":10}""");
        Assert.Equal(AssociationRules.Default.EndgameTurnsPerSeat, rules.EndgameTurnsPerSeat);
    }

    [Theory]
    [InlineData("ColumnBase", -1)]
    [InlineData("EndgameTurnsPerSeat", 0)]
    [InlineData("DuelTurnSeconds", 2)]
    [InlineData("SoloMaxBoardSeconds", 30)]
    [InlineData("SoloDefaultBoardSeconds", 5000)]
    public void InvalidSettings_AreReported(string setting, int value)
    {
        var options = new AssociationRulesOptions();
        typeof(AssociationRulesOptions).GetProperty(setting)!.SetValue(options, value);
        Assert.NotEmpty(options.ToRules().Validate());
    }

    /// <summary>The configuration seam: values in "Associations:Rules" reach the provider; missing ones default.</summary>
    [Fact]
    public void TheProvider_ReadsConfiguration()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Associations:Rules:FinalBase"] = "15",
                ["Associations:Rules:EndgameTurnsPerSeat"] = "3",
            })
            .Build();
        var services = new ServiceCollection();
        services.AddOptions<AssociationRulesOptions>().Bind(config.GetSection(AssociationRulesOptions.SectionName));
        services.AddSingleton<IAssociationRulesProvider, ConfiguredAssociationRulesProvider>();
        var provider = services.BuildServiceProvider().GetRequiredService<IAssociationRulesProvider>();

        var rules = provider.GetRulesFor(quizId: 1);

        Assert.Equal(15, rules.FinalBase);
        Assert.Equal(3, rules.EndgameTurnsPerSeat);
        Assert.Equal(5, rules.ColumnBase);
    }
}
