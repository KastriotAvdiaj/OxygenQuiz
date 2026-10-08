using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Quiz;
using QuizAPI.Services.Associations;
using QuizAPI.Services.QuizSessionServices;
using Xunit;

namespace QuizAPI.Tests.Multiplayer;

/// <summary>
/// The hub's side of the Duel (docs/quiz/multiplayer.md §4.3, §5): picking a board, dispatching
/// the start by format, the three move methods, the catch-up for someone joining mid-Duel, and
/// leaving as a forfeit. The Duel itself is AssociationMatchOrchestratorTests'.
/// </summary>
public class QuizHubDuelTests
{
    private const string Room = "DUEL01";
    private const int BoardQuiz = 41;
    private const int ClassicQuiz = 42;
    private static readonly Guid AnaId = Guid.NewGuid();

    private static HubHarness World()
    {
        var quizzes = new Mock<IQuizService>();
        quizzes.Setup(q => q.CanHostQuizAsync(It.IsAny<int>(), It.IsAny<Guid>())).ReturnsAsync(true);
        quizzes.Setup(q => q.GetFormatAsync(BoardQuiz)).ReturnsAsync(QuizFormat.Associations);
        quizzes.Setup(q => q.GetFormatAsync(ClassicQuiz)).ReturnsAsync(QuizFormat.Classic);
        return new HubHarness(s => s.AddSingleton(quizzes.Object));
    }

    private static async Task<HubHarness> Lobby()
    {
        var h = World();
        await h.As("ana", "ana-1", AnaId, "Admin").CreateSession(Room, "Ana's lobby", 4);
        await h.As("ben", "ben-1").JoinSession(Room);
        return h;
    }

    private static SelectedQuizView Pick(int id, string? claimedFormat = null) =>
        new() { Id = id.ToString(), Title = "Oxygen final", Format = claimedFormat };

    // ── Picking ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task An_admin_host_can_pick_a_board_and_the_format_is_the_servers_not_the_clients()
    {
        var h = await Lobby();

        await h.As("ana", "ana-1", AnaId, "Admin").SelectQuiz(Room, Pick(BoardQuiz, claimedFormat: "Classic"));

        h.Group.Verify(c => c.QuizSelected(It.Is<SelectedQuizView>(q => q.Id == "41" && q.Format == "Associations")), Times.Once);
        Assert.Equal("Associations", (await h.Sessions.GetSessionAsync(Room))!.SelectedQuiz!.Format);
    }

    [Fact]
    public async Task A_classic_pick_is_labelled_classic()
    {
        var h = await Lobby();

        await h.As("ana", "ana-1", AnaId).SelectQuiz(Room, Pick(ClassicQuiz, claimedFormat: "Associations"));

        Assert.Equal("Classic", (await h.Sessions.GetSessionAsync(Room))!.SelectedQuiz!.Format);
    }

    /// <summary>
    /// Since Associations was released (2026-10-08) any host may pick a Board. Until then this test
    /// pinned the opposite: a non-admin got "You can't host this quiz." (associations.md §0).
    /// </summary>
    [Fact]
    public async Task A_host_who_isnt_an_admin_can_pick_a_board()
    {
        var h = World();
        await h.As("ben", "ben-1").CreateSession(Room, "Ben's lobby", 4);

        await h.As("ben", "ben-1").SelectQuiz(Room, Pick(BoardQuiz));

        Assert.Equal("Associations", (await h.Sessions.GetSessionAsync(Room))!.SelectedQuiz!.Format);
    }

    // ── Starting ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Starting_a_board_starts_a_duel_and_a_classic_quiz_starts_the_classic_match()
    {
        var h = await Lobby();
        var ana = h.As("ana", "ana-1", AnaId, "Admin");

        await ana.SelectQuiz(Room, Pick(BoardQuiz));
        await h.As("ana", "ana-1", AnaId, "Admin").StartMatch(Room);
        h.Duels.Verify(d => d.StartMatchAsync(Room), Times.Once);
        h.Classic.Verify(c => c.StartMatchAsync(It.IsAny<string>()), Times.Never);

        await h.As("ana", "ana-1", AnaId, "Admin").SelectQuiz(Room, Pick(ClassicQuiz));
        await h.As("ana", "ana-1", AnaId, "Admin").StartMatch(Room);
        h.Classic.Verify(c => c.StartMatchAsync(Room), Times.Once);
    }

    [Fact]
    public async Task A_refused_duel_start_reaches_the_host_as_the_orchestrators_sentence()
    {
        var h = await Lobby();
        await h.As("ana", "ana-1", AnaId, "Admin").SelectQuiz(Room, Pick(BoardQuiz));
        h.Duels.Setup(d => d.StartMatchAsync(Room))
            .ThrowsAsync(new InvalidOperationException("An Associations duel is for exactly 2 players."));

        var ex = await Assert.ThrowsAsync<HubException>(() => h.As("ana", "ana-1", AnaId, "Admin").StartMatch(Room));

        Assert.Equal("An Associations duel is for exactly 2 players.", ex.Message);
    }

    // ── Moves ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task The_move_methods_act_as_the_signed_in_account()
    {
        var h = await Lobby();

        await h.As("ben", "ben-1").OpenTile(Room, 5);
        await h.As("ben", "ben-1").GuessAssociation(Room, "B", "Light");
        await h.As("ben", "ben-1").PassTurn(Room);

        h.Duels.Verify(d => d.OpenTileAsync(Room, "ben", 5), Times.Once);
        h.Duels.Verify(d => d.GuessAsync(Room, "ben", "B", "Light"), Times.Once);
        h.Duels.Verify(d => d.PassAsync(Room, "ben"), Times.Once);
    }

    [Fact]
    public async Task A_refused_move_reaches_the_player_as_the_runners_sentence()
    {
        var h = await Lobby();
        h.Duels.Setup(d => d.OpenTileAsync(Room, "ben", 5)).ThrowsAsync(new DuelMoveException("It isn't your turn."));

        var ex = await Assert.ThrowsAsync<HubException>(() => h.As("ben", "ben-1").OpenTile(Room, 5));

        Assert.Equal("It isn't your turn.", ex.Message);
    }

    // ── Joining and leaving mid-Duel ─────────────────────────────────────────

    [Fact]
    public async Task Joining_while_a_duel_is_on_catches_the_caller_up()
    {
        var h = await Lobby();
        var view = new DuelViewDTO { QuizTitle = "Oxygen final", CurrentSeat = 1 };
        h.Duels.Setup(d => d.CurrentViewAsync(Room)).ReturnsAsync(view);

        await h.As("ben", "ben-2").JoinSession(Room);

        h.Caller.Verify(c => c.DuelState(view), Times.Once);
    }

    [Fact]
    public async Task No_catch_up_is_sent_when_no_duel_is_on()
    {
        var h = await Lobby();

        await h.As("ben", "ben-2").JoinSession(Room);

        h.Caller.Verify(c => c.DuelState(It.IsAny<DuelViewDTO>()), Times.Never);
    }

    [Fact]
    public async Task Leaving_the_lobby_is_leaving_the_duel()
    {
        var h = await Lobby();

        await h.As("ben", "ben-1").LeaveSession(Room);

        h.Duels.Verify(d => d.PlayerLeftAsync(Room, "ben"), Times.Once);
    }
}
