using QuizAPI.DTOs.Quiz;
using QuizAPI.Exceptions;
using QuizAPI.Services.Associations;
using Xunit;

namespace QuizAPI.Tests.Associations;

/// <summary>
/// What a Board must be to be saved. Messages name the Column and Tile, because the builder shows
/// them to the author. The builder's zod schema mirrors these; this is the gate.
/// </summary>
public class AssociationBoardValidatorTests
{
    private static readonly AssociationRules Rules = AssociationRules.Default;

    private static AssociationBoardInput Valid() => AssociationBoardServiceTests.Board();

    private static string Fails(AssociationBoardInput board, int seconds = 240) =>
        Assert.Throws<AppValidationException>(() => AssociationBoardValidator.ValidateAndClean(board, seconds, Rules)).Message;

    [Fact]
    public void AValidBoard_ComesBackCleaned()
    {
        var board = Valid();
        board.Columns[0].Tiles[0] = "  A1 ";
        board.Columns[1].AcceptableSolutions = new() { " solution b ", "", "Other B", "other b" };

        var clean = AssociationBoardValidator.ValidateAndClean(board, 240, Rules);

        Assert.Equal("A1", clean.Columns[0].Tiles[0]);
        // Blank dropped, duplicates of the solution (case-insensitively) and of each other dropped.
        Assert.Equal(new[] { "Other B" }, clean.Columns[1].AcceptableSolutions);
    }

    [Fact]
    public void ThreeColumns_IsNotABoard()
    {
        var board = Valid();
        board.Columns.RemoveAt(3);
        Assert.Contains("exactly 4 columns", Fails(board));
    }

    [Fact]
    public void AColumnNeedsFourTiles()
    {
        var board = Valid();
        board.Columns[1].Tiles.RemoveAt(0);
        Assert.Contains("Column B needs exactly 4 tiles", Fails(board));
    }

    [Fact]
    public void EveryProblemIsReported_NotJustTheFirst()
    {
        var board = Valid();
        board.Columns[0].Tiles[1] = "";
        board.Columns[3].Solution = " ";
        board.FinalSolution = "";

        var message = Fails(board, seconds: 5);

        Assert.Contains("Tile A2 is empty", message);
        Assert.Contains("Column D needs a solution", message);
        Assert.Contains("The final needs a solution", message);
        Assert.Contains("Board time", message);
    }

    [Fact]
    public void TextHasALengthLimit()
    {
        var board = Valid();
        board.Columns[2].Tiles[2] = new string('x', 101);
        Assert.Contains("Tile C3 is longer than 100", Fails(board));
    }

    [Fact]
    public void OtherSpellingsAreCapped()
    {
        var board = Valid();
        board.FinalAcceptableSolutions = new() { "1", "2", "3", "4", "5" };
        Assert.Contains("Up to 4 other spellings", Fails(board));
    }

    [Fact]
    public void BoardTimeFollowsTheRules()
    {
        var wider = Rules with { SoloMaxBoardSeconds = 900 };
        AssociationBoardValidator.ValidateAndClean(Valid(), 900, wider);
        Assert.Throws<AppValidationException>(() => AssociationBoardValidator.ValidateAndClean(Valid(), 900, Rules));
    }
}
