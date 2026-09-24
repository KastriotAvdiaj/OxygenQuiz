using QuizAPI.Services.Associations;
using Xunit;
using static QuizAPI.Tests.Associations.TestBoard;

namespace QuizAPI.Tests.Associations;

/// <summary>
/// Solo: one board timer; a Tile earns one Guess, a correct Guess earns another, and wrong Guesses
/// cost no points (D18 — docs/quiz/associations.md, "Solo").
/// </summary>
public class SoloRulesTests
{
    private static AssociationState NewSolo(int seconds = 240) => AssociationEngine.StartSolo(T0, seconds);

    [Fact]
    public void TilesOpenFreely_ManyInARow()
    {
        var s = NewSolo();
        for (var tile = 1; tile <= 6; tile++)
            s = Must(s, AssociationMove.Open(0, tile, At(tile))).State;
        Assert.Equal(6, s.OpenTiles.Count);
    }

    [Fact]
    public void NoGuess_BeforeATileIsOpened()
    {
        Refused(NewSolo(), AssociationMove.Guess(0, GuessTarget.A, "Rome", At(1)), MoveRejection.MustOpenATileFirst);
    }

    [Fact]
    public void ATile_EarnsOneGuess_AndAWrongOneSpendsIt()
    {
        var s = Must(NewSolo(), AssociationMove.Open(0, 1, At(1))).State;
        var wrong = Must(s, AssociationMove.Guess(0, GuessTarget.Final, "nope", At(2)));
        Assert.False(wrong.IsCorrect);
        Assert.False(wrong.TurnPassed);   // Solo has no one to pass to
        Assert.Equal(0, wrong.Points);
        s = wrong.State;

        Refused(s, AssociationMove.Guess(0, GuessTarget.A, "nope again", At(3)), MoveRejection.MustOpenATileFirst);

        s = Must(s, AssociationMove.Open(0, 2, At(4))).State;
        Must(s, AssociationMove.Guess(0, GuessTarget.A, "still no", At(5)));
    }

    [Fact]
    public void ACorrectGuess_EarnsAnother_AtAnyTarget()
    {
        var s = Must(NewSolo(), AssociationMove.Open(0, 1, At(1))).State;
        s = Must(s, AssociationMove.Guess(0, GuessTarget.A, "Rome", At(2))).State;
        s = Must(s, AssociationMove.Guess(0, GuessTarget.C, "caj", At(3))).State;
        var final = Must(s, AssociationMove.Guess(0, GuessTarget.Final, "Italy", At(4)));
        Assert.True(final.FinalSolved);
    }

    [Fact]
    public void OpeningAnotherTile_InsteadOfGuessing_IsAllowed()
    {
        var s = NewSolo();
        for (var tile = 1; tile <= 3; tile++)
            s = Must(s, AssociationMove.Open(0, tile, At(tile))).State;
        Assert.Equal(TurnPhase.MayGuess, s.Phase);
    }

    [Fact]
    public void WithEveryTileOpen_WrongGuessesCountDownTheEndgame_AndRightOnesDont()
    {
        var s = NewSolo();
        for (var tile = 1; tile <= 16; tile++)
            s = Must(s, AssociationMove.Open(0, tile, At(tile))).State;

        // The Guess the last Tile earned; wrong, and nothing is left to open: the endgame begins.
        var first = Must(s, AssociationMove.Guess(0, GuessTarget.A, "x", At(20)));
        Assert.True(first.EndgameStarted);
        s = first.State;
        Assert.Equal(TurnPhase.MayGuess, s.Phase);

        // A right Guess doesn't use a try.
        s = Must(s, AssociationMove.Guess(0, GuessTarget.B, "drite", At(21))).State;
        Assert.Equal(1, s.EndgameTurnsTaken[0]);

        // EndgameTurnsPerSeat = 2: one more wrong Guess is allowed, the next ends the game.
        s = Must(s, AssociationMove.Guess(0, GuessTarget.C, "x", At(22))).State;
        Assert.False(s.IsOver);
        var last = Must(s, AssociationMove.Guess(0, GuessTarget.C, "y", At(23)));
        Assert.Equal(GameEndReason.EndgameOver, last.GameEnded);
        Assert.Equal(5 + 0, last.State.Scores[0]);   // B, all its Tiles open
    }

    [Fact]
    public void AnOpenTile_CannotBeOpenedAgain_AndAnUnknownOneNotAtAll()
    {
        var s = Must(NewSolo(), AssociationMove.Open(0, 3, At(1))).State;
        Refused(s, AssociationMove.Open(0, 3, At(2)), MoveRejection.TileAlreadyOpen);
        Refused(s, AssociationMove.Open(0, 99, At(2)), MoveRejection.UnknownTile);
    }

    [Fact]
    public void ATileOfASolvedColumn_IsAlreadyOpen()
    {
        var s = Must(NewSolo(), AssociationMove.Open(0, 5, At(0.5))).State;
        s = Must(s, AssociationMove.Guess(0, GuessTarget.A, "Rome", At(1))).State;
        Refused(s, AssociationMove.Open(0, 2, At(2)), MoveRejection.TileAlreadyOpen);
    }

    [Fact]
    public void NothingIsAcceptedOnceTheBoardTimerRunsOut()
    {
        var s = NewSolo(60);
        Refused(s, AssociationMove.Open(0, 1, At(60)), MoveRejection.BoardTimeUp);
        Must(s, AssociationMove.Open(0, 1, At(59.9)));
    }

    [Fact]
    public void TheServerEndsATimedOutGame_KeepingThePointsScored()
    {
        var s = Must(NewSolo(60), AssociationMove.Open(0, 5, At(1))).State;
        s = Must(s, AssociationMove.Guess(0, GuessTarget.A, "Rome", At(5))).State;
        var ended = AssociationEngine.End(s, GameEndReason.TimeUp);

        Assert.Equal(GameEndReason.TimeUp, ended.EndReason);
        Assert.Equal(9, ended.Scores[0]);
    }

    [Fact]
    public void GivingUp_EndsTheGame()
    {
        var outcome = Must(NewSolo(), AssociationMove.GiveUp(0, At(3)));
        Assert.Equal(GameEndReason.GaveUp, outcome.GameEnded);
        Assert.True(outcome.State.IsOver);
    }

    [Fact]
    public void PassingAndTurnExpiry_AreDuelMoves()
    {
        var s = NewSolo();
        Refused(s, AssociationMove.Pass(0, At(1)), MoveRejection.NotInThisStyle);
        Refused(s, AssociationMove.TurnExpired(0, At(1)), MoveRejection.NotInThisStyle);
    }

    [Fact]
    public void ThereIsOnlySeatZero()
    {
        Refused(NewSolo(), AssociationMove.Open(1, 1, At(1)), MoveRejection.UnknownSeat);
    }

    [Fact]
    public void MovesNeedTheirFields()
    {
        var s = Must(NewSolo(), AssociationMove.Open(0, 16, At(0.5))).State;
        Refused(s, new AssociationMove(0, MoveKind.OpenTile, At(1)), MoveRejection.Malformed);
        Refused(s, new AssociationMove(0, MoveKind.Guess, At(1), GuessText: "Rome"), MoveRejection.Malformed);
    }

    [Theory]
    [InlineData(GameEndReason.FinalSolved)]
    [InlineData(GameEndReason.EndgameOver)]
    [InlineData(GameEndReason.GaveUp)]
    public void EndingFromOutside_IsOnlyForReasonsNoMoveExpresses(GameEndReason reason) =>
        Assert.Throws<ArgumentException>(() => AssociationEngine.End(NewSolo(), reason));
}
