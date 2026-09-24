using QuizAPI.Services.Associations;
using Xunit;
using static QuizAPI.Tests.Associations.TestBoard;

namespace QuizAPI.Tests.Associations;

/// <summary>
/// The Duel turn, as decided on 2026-09-22 (docs/quiz/associations.md, "Duel"): open exactly one
/// Tile, then Guess; a correct Guess earns another Guess but not another Tile; a wrong Guess, a Pass
/// or the clock passes the turn; once every Tile is open each Seat gets a fixed number of guess-only
/// turns. One test per rule, named after the rule.
/// </summary>
public class DuelRulesTests
{
    private static AssociationState NewDuel(int firstSeat = 0, int seats = 2) =>
        AssociationEngine.StartDuel(T0, seats, firstSeat);

    // ── The turn ────────────────────────────────────────────────────────

    [Fact]
    public void ATurnStartsByOpeningATile_GuessingFirstIsRefused()
    {
        var s = NewDuel();
        Refused(s, AssociationMove.Guess(0, GuessTarget.A, "Rome", At(1)), MoveRejection.MustOpenATileFirst);
        Refused(s, AssociationMove.Pass(0, At(1)), MoveRejection.MustOpenATileFirst);
    }

    [Fact]
    public void OnlyTheSeatWhoseTurnItIs_MayAct()
    {
        var s = NewDuel(firstSeat: 0);
        Refused(s, AssociationMove.Open(1, 1, At(1)), MoveRejection.NotYourTurn);
    }

    [Fact]
    public void ATurnOpensExactlyOneTile()
    {
        var s = Must(NewDuel(), AssociationMove.Open(0, 1, At(1))).State;
        Refused(s, AssociationMove.Open(0, 2, At(2)), MoveRejection.AlreadyOpenedThisTurn);
    }

    [Fact]
    public void ACorrectGuess_KeepsTheTurn_AllowsAnotherGuess_ButNotAnotherTile()
    {
        var s = Must(NewDuel(), AssociationMove.Open(0, 1, At(1))).State;
        var correct = Must(s, AssociationMove.Guess(0, GuessTarget.A, "Rome", At(2)));

        Assert.True(correct.IsCorrect);
        Assert.False(correct.TurnPassed);
        Assert.Equal(0, correct.State.CurrentSeat);
        Assert.Equal(TurnPhase.MayGuess, correct.State.Phase);

        Refused(correct.State, AssociationMove.Open(0, 5, At(3)), MoveRejection.AlreadyOpenedThisTurn);
        var second = Must(correct.State, AssociationMove.Guess(0, GuessTarget.B, "Drite", At(3)));
        Assert.True(second.IsCorrect);
    }

    [Fact]
    public void AWrongGuess_PassesTheTurn()
    {
        var s = Must(NewDuel(), AssociationMove.Open(0, 1, At(1))).State;
        var wrong = Must(s, AssociationMove.Guess(0, GuessTarget.A, "Paris", At(2)));

        Assert.False(wrong.IsCorrect);
        Assert.True(wrong.TurnPassed);
        Assert.Equal(1, wrong.State.CurrentSeat);
        Assert.Equal(TurnPhase.MustOpen, wrong.State.Phase);
        Assert.Equal(At(2), wrong.State.TurnStartedAt);
        Assert.Equal(0, wrong.State.Scores[0]);
    }

    [Fact]
    public void APassAfterOpening_PassesTheTurn()
    {
        var s = Must(NewDuel(), AssociationMove.Open(0, 1, At(1))).State;
        var pass = Must(s, AssociationMove.Pass(0, At(2)));
        Assert.True(pass.TurnPassed);
        Assert.Equal(1, pass.State.CurrentSeat);
    }

    [Fact]
    public void AGuessMayTargetAnyColumn_NotJustTheOneOpened()
    {
        var s = Must(NewDuel(), AssociationMove.Open(0, 1, At(1))).State;   // a Tile in A
        var d = Must(s, AssociationMove.Guess(0, GuessTarget.D, "Water", At(2)));
        Assert.True(d.IsCorrect);
        Assert.Equal(9, d.Points);   // none of D's Tiles were open
    }

    [Fact]
    public void AGuessMayTargetTheFinal_AtAnyPoint()
    {
        var s = Must(NewDuel(), AssociationMove.Open(0, 1, At(1))).State;
        var final = Must(s, AssociationMove.Guess(0, GuessTarget.Final, "Italy", At(2)));
        Assert.Equal(GameEndReason.FinalSolved, final.GameEnded);
        Assert.Equal(0, final.State.FinalSolvedBy);
    }

    [Fact]
    public void AnEmptyGuess_IsRefused_AndDoesNotCostTheTurn()
    {
        var s = Must(NewDuel(), AssociationMove.Open(0, 1, At(1))).State;
        Refused(s, AssociationMove.Guess(0, GuessTarget.A, "   ", At(2)), MoveRejection.EmptyGuess);
    }

    [Fact]
    public void ASolvedTarget_CannotBeGuessedAgain()
    {
        var s = Must(NewDuel(), AssociationMove.Open(0, 1, At(1))).State;
        s = Must(s, AssociationMove.Guess(0, GuessTarget.A, "Rome", At(2))).State;
        Refused(s, AssociationMove.Guess(0, GuessTarget.A, "Rome", At(3)), MoveRejection.TargetAlreadySolved);
    }

    [Fact]
    public void SolvingAColumn_OpensItsRemainingTiles()
    {
        var s = Must(NewDuel(), AssociationMove.Open(0, 1, At(1))).State;
        var a = Must(s, AssociationMove.Guess(0, GuessTarget.A, "Rome", At(2)));

        Assert.Equal(new[] { 2, 3, 4 }, a.OpenedTiles.OrderBy(x => x));
        Assert.True(TilesOf(ColumnLetter.A).All(a.State.OpenTiles.Contains));
    }

    [Fact]
    public void ColumnsCanGoToDifferentSeats()
    {
        var s = Must(NewDuel(), AssociationMove.Open(0, 1, At(1))).State;
        s = Must(s, AssociationMove.Guess(0, GuessTarget.A, "Rome", At(2))).State;     // seat 0: A (5+3)
        s = Must(s, AssociationMove.Pass(0, At(3))).State;
        s = Must(s, AssociationMove.Open(1, 5, At(4))).State;
        s = Must(s, AssociationMove.Guess(1, GuessTarget.B, "Drite", At(5))).State;    // seat 1: B (5+3)

        Assert.Equal(8, s.Scores[0]);
        Assert.Equal(8, s.Scores[1]);
        Assert.Equal(0, s.SolvedColumns[ColumnLetter.A].Seat);
        Assert.Equal(1, s.SolvedColumns[ColumnLetter.B].Seat);
    }

    // ── The clock ───────────────────────────────────────────────────────

    [Fact]
    public void AMoveAfterTheTurnClock_IsRefused()
    {
        var s = NewDuel();
        Refused(s, AssociationMove.Open(0, 1, At(Rules.DuelTurnSeconds + 0.1)), MoveRejection.TurnTimeUp);
    }

    [Fact]
    public void TheServerRecordsAnExpiry_OnlyOnceTheClockHasRunOut()
    {
        var s = NewDuel();
        Refused(s, AssociationMove.TurnExpired(0, At(Rules.DuelTurnSeconds - 1)), MoveRejection.TurnNotOver);

        var expired = Must(s, AssociationMove.TurnExpired(0, At(Rules.DuelTurnSeconds)));
        Assert.True(expired.TurnPassed);
        Assert.Equal(1, expired.State.CurrentSeat);
        Assert.Empty(expired.State.OpenTiles);   // nothing is opened on the player's behalf
    }

    [Fact]
    public void ACorrectGuess_RestartsTheTurnClock()
    {
        var s = Must(NewDuel(), AssociationMove.Open(0, 1, At(25))).State;
        s = Must(s, AssociationMove.Guess(0, GuessTarget.A, "Rome", At(29))).State;

        Assert.Equal(At(29), s.TurnStartedAt);
        // 29 + 30 = 59: a Guess at 50 is inside the new clock, though past the original 30s.
        Must(s, AssociationMove.Guess(0, GuessTarget.B, "Drite", At(50)));
    }

    [Fact]
    public void TheTurnLength_IsASetting()
    {
        var rules = Rules with { DuelTurnSeconds = 10 };
        var s = NewDuel();
        Refused(s, AssociationMove.Open(0, 1, At(10.5)), MoveRejection.TurnTimeUp, rules);
        Must(s, AssociationMove.TurnExpired(0, At(10)), rules);
    }

    // ── The endgame ─────────────────────────────────────────────────────

    /// <summary>Plays turns that each open one Tile and pass, until all 16 are open. Seat 0 opens the 16th.</summary>
    private static AssociationState OpenEverythingByPassing()
    {
        var s = NewDuel(firstSeat: 1);
        var clock = 0.0;
        for (var tile = 1; tile <= 16; tile++)
        {
            var seat = s.CurrentSeat;
            s = Must(s, AssociationMove.Open(seat, tile, At(++clock))).State;
            if (tile < 16) s = Must(s, AssociationMove.Pass(seat, At(++clock))).State;
        }
        Assert.Equal(0, s.CurrentSeat);
        Assert.Equal(16, s.OpenTiles.Count);
        Assert.False(s.InEndgame);   // the turn that opened the last Tile began with one closed
        return s;
    }

    /// <summary>
    /// The worked example from docs/quiz/associations.md: P1 opens the 16th Tile and misses →
    /// endgame. P2 misses (1 of 2), P1 misses (1 of 2), P2 solves C then misses the Final (2 of 2),
    /// P1 misses (2 of 2) → over.
    /// </summary>
    [Fact]
    public void TheEndgame_WorkedExample()
    {
        var s = OpenEverythingByPassing();   // seat 0 = "P1"
        var t = 40.0;   // inside the turn clock of the turn that opened the last Tile (at 31s)

        var miss = Must(s, AssociationMove.Guess(0, GuessTarget.Final, "France", At(t++)));
        Assert.True(miss.EndgameStarted);
        Assert.Equal(1, miss.State.CurrentSeat);
        Assert.Equal(TurnPhase.MayGuess, miss.State.Phase);   // endgame turns are guesses only
        Assert.Equal(new[] { 0, 1 }, miss.State.EndgameTurnsTaken);
        s = miss.State;

        s = Must(s, AssociationMove.Guess(1, GuessTarget.A, "Paris", At(t++))).State;   // P2 1/2
        Assert.Equal(new[] { 1, 1 }, s.EndgameTurnsTaken);
        s = Must(s, AssociationMove.Guess(0, GuessTarget.A, "Berlin", At(t++))).State;  // P1 1/2
        Assert.Equal(new[] { 1, 2 }, s.EndgameTurnsTaken);

        var c = Must(s, AssociationMove.Guess(1, GuessTarget.C, "caj", At(t++)));     // P2 2/2 solves C…
        Assert.True(c.IsCorrect);
        Assert.Equal(5, c.Points);   // every Tile open: the Column's base only
        Assert.Equal(new[] { 1, 2 }, c.State.EndgameTurnsTaken);   // …which earns no extra turn
        s = Must(c.State, AssociationMove.Guess(1, GuessTarget.Final, "Spain", At(t++))).State;  // …then misses

        var last = Must(s, AssociationMove.Guess(0, GuessTarget.B, "Madrid", At(t++)));  // P1 2/2 misses
        Assert.Equal(GameEndReason.EndgameOver, last.GameEnded);
        Assert.True(last.State.IsOver);
        Assert.Null(last.State.FinalSolvedBy);
        Assert.Equal(new[] { 0, 5 }, last.State.Scores);

        Refused(last.State, AssociationMove.Guess(1, GuessTarget.Final, "Italy", At(t++)), MoveRejection.GameOver);
    }

    [Fact]
    public void TheEndgameLength_IsASetting()
    {
        var rules = Rules with { EndgameTurnsPerSeat = 3 };
        var s = OpenEverythingByPassing();
        var t = 40.0;   // inside the turn clock of the turn that opened the last Tile (at 31s)
        var turns = 0;

        s = Must(s, AssociationMove.Pass(0, At(t++)), rules).State;
        while (!s.IsOver)
        {
            turns++;
            Assert.True(turns <= 20, "the endgame never ended");
            s = Must(s, AssociationMove.Pass(s.CurrentSeat, At(t++)), rules).State;
        }

        Assert.Equal(6, turns);   // 3 each
        Assert.Equal(GameEndReason.EndgameOver, s.EndReason);
    }

    [Fact]
    public void TheFinal_CanStillBeWonInTheEndgame()
    {
        var s = OpenEverythingByPassing();
        s = Must(s, AssociationMove.Pass(0, At(40))).State;
        var win = Must(s, AssociationMove.Guess(1, GuessTarget.Final, "Italy", At(41)));

        Assert.Equal(GameEndReason.FinalSolved, win.GameEnded);
        Assert.Equal(10 + 4 * 5, win.Points);   // all Tiles open: every Column is worth its base
    }

    // ── More seats ──────────────────────────────────────────────────────

    /// <summary>1v1v1 (future) is a seat count, not a new engine: turns go round in order.</summary>
    [Fact]
    public void ThreeSeats_TakeTurnsInOrder()
    {
        var s = NewDuel(firstSeat: 2, seats: 3);
        s = Must(s, AssociationMove.Open(2, 1, At(1))).State;
        s = Must(s, AssociationMove.Pass(2, At(2))).State;
        Assert.Equal(0, s.CurrentSeat);
        s = Must(s, AssociationMove.Open(0, 2, At(3))).State;
        s = Must(s, AssociationMove.Pass(0, At(4))).State;
        Assert.Equal(1, s.CurrentSeat);
    }

    // ── Things a Duel doesn't have ──────────────────────────────────────

    [Fact]
    public void GivingUp_IsASoloMove()
    {
        Refused(NewDuel(), AssociationMove.GiveUp(0, At(1)), MoveRejection.NotInThisStyle);
    }

    [Fact]
    public void AForfeit_EndsTheGame_FromOutside()
    {
        var s = Must(NewDuel(), AssociationMove.Open(0, 1, At(1))).State;
        var ended = AssociationEngine.End(s, GameEndReason.Forfeit);

        Assert.Equal(GameEndReason.Forfeit, ended.EndReason);
        Refused(ended, AssociationMove.Pass(0, At(2)), MoveRejection.GameOver);
    }
}
