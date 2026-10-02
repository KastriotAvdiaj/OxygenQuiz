using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Moq;
using QuizAPI.Data;
using QuizAPI.DTOs.Classroom;
using QuizAPI.Exceptions;
using QuizAPI.Models.Associations;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Services.Associations;
using QuizAPI.Services.Classroom;
using QuizAPI.Tests.Associations;
using Xunit;

namespace QuizAPI.Tests.Classroom;

/// <summary>
/// Host mode over the real repositories and an in-memory database (docs/quiz/classroom.md). Each
/// call is its own "request" on a fresh DbContext, so every assertion is about what was saved and
/// what replaying it gives — the turns (the Duel's, per ADR 0023), Undo (ADR 0025), the pausable
/// clocks and the last round (C6), screens (ADR 0024) and abandonment.
/// </summary>
public class HostedGameServiceTests
{
    private static readonly Guid Teacher = Guid.Parse("55555555-5555-5555-5555-555555555555");
    private static readonly Guid OtherTeacher = Guid.Parse("66666666-6666-6666-6666-666666666666");

    internal sealed class FakeNotifier : IHostedGameNotifier
    {
        public readonly List<HostedGameViewDTO> Sent = new();
        public readonly List<string> Revoked = new();
        public Task GameChangedAsync(Guid gameId, HostedGameViewDTO displayView) { Sent.Add(displayView); return Task.CompletedTask; }
        public Task DisplaysRevokedAsync(IReadOnlyList<string> connectionIds) { Revoked.AddRange(connectionIds); return Task.CompletedTask; }
    }

    internal sealed class HostWorld
    {
        public readonly PlayWorld Play;
        public readonly HostedDisplayRegistry Screens = new();
        public readonly FakeNotifier Notifier = new();
        public TestClock Clock => Play.Clock;
        public int QuizId => Play.QuizId;
        public int[][] Tiles => Play.Tiles;

        public HostWorld(QuizStatus status = QuizStatus.Public) => Play = new PlayWorld(status);

        public async Task<T> Call<T>(Func<HostedGameService, Task<T>> call)
        {
            await using var ctx = Play.Context();
            var rules = new Mock<IAssociationRulesProvider>();
            rules.Setup(r => r.GetRulesFor(It.IsAny<int>())).Returns(() => Play.Rules);
            return await call(new HostedGameService(new HostedGameRepository(ctx), new AssociationBoardRepository(ctx), rules.Object, Screens, Notifier, Clock));
        }

        public AssociationGame Game(Guid id)
        {
            using var ctx = Play.Context();
            return ctx.AssociationGames.AsNoTracking().Include(g => g.Moves).Include(g => g.Teams).Single(g => g.Id == id);
        }

        public Task<HostedGameViewDTO> Start(int teams = 2, int? gameSeconds = null, int? turnSeconds = null, Guid? host = null) =>
            Call(s => s.StartAsync(host ?? Teacher, Request(QuizId, teams, gameSeconds, turnSeconds)));
    }

    private static StartHostedGameRequest Request(int quizId, int teams, int? gameSeconds = null, int? turnSeconds = null) => new()
    {
        QuizId = quizId,
        Teams = Enumerable.Range(0, teams).Select(i => new HostedTeamInput { Name = "", Students = new() { $"Student {i}" } }).ToList(),
        GameSeconds = gameSeconds,
        TurnSeconds = turnSeconds,
    };

    private static int Next(HostedGameViewDTO v) => (v.CurrentSeat!.Value + 1) % v.Teams.Count;

    // ── Starting ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Start_CreatesAHostedGame_WithItsTeams_AndNoSessions()
    {
        var world = new HostWorld();
        var view = await world.Start(teams: 3, gameSeconds: 600, turnSeconds: 60);

        var game = world.Game(view.Id);
        Assert.Equal(PlayStyle.Hosted, game.PlayStyle);
        Assert.Equal(Teacher, game.HostUserId);
        Assert.Equal(3, game.SeatCount);
        Assert.Equal(world.Clock.Now.UtcDateTime.AddSeconds(600), game.GameDeadlineUtc);
        Assert.Equal(world.Clock.Now.UtcDateTime.AddSeconds(60), game.TurnDeadlineUtc);
        Assert.Equal(new[] { "Red", "Blue", "Green" }, view.Teams.Select(t => t.Name));
        Assert.Equal(new[] { "red", "blue", "green" }, view.Teams.Select(t => t.Colour));
        Assert.Equal(new[] { "Student 1" }, view.Teams[1].Students);
        Assert.Equal(game.FirstSeat, view.CurrentSeat);
        Assert.True(view.CanOpen);
        Assert.False(view.CanGuess);
        Assert.Null(view.AnswerKey);   // no Display connected

        await using var ctx = world.Play.Context();
        Assert.Empty(ctx.QuizSessions);   // not the Teacher playing: nothing reaches stats or history
    }

    [Theory]
    [InlineData(1, null, null)]
    [InlineData(5, null, null)]
    [InlineData(2, 600, null)]
    [InlineData(2, null, 60)]
    [InlineData(2, 200, 60)]
    [InlineData(2, 4000, 60)]
    [InlineData(2, 600, 45)]
    public async Task Start_RefusesBadTeamCountsAndClocks(int teams, int? gameSeconds, int? turnSeconds)
    {
        var world = new HostWorld();
        await Assert.ThrowsAsync<AppValidationException>(() => world.Start(teams, gameSeconds, turnSeconds));
    }

    [Fact]
    public async Task Start_RefusesTwoTeamsOfTheSameName()
    {
        var world = new HostWorld();
        var request = Request(world.QuizId, 2);
        request.Teams[0].Name = "Owls";
        request.Teams[1].Name = " owls ";
        await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.StartAsync(Teacher, request)));
    }

    [Fact]
    public async Task ATeacher_HostsTheirOwnDraft_ButNotSomeoneElses()
    {
        var world = new HostWorld(QuizStatus.Draft);
        await Assert.ThrowsAsync<NotFoundException>(() => world.Start());
        var own = await world.Start(host: AssociationBoardServiceTests.OwnerId);
        Assert.False(own.IsOver);
    }

    [Fact]
    public async Task AnotherTeachersGame_IsNotFound()
    {
        var world = new HostWorld();
        var view = await world.Start();
        await Assert.ThrowsAsync<NotFoundException>(() => world.Call(s => s.GetAsync(view.Id, OtherTeacher)));
        await Assert.ThrowsAsync<NotFoundException>(() => world.Call(s => s.OpenAsync(view.Id, OtherTeacher, world.Tiles[0][0])));
    }

    // ── Turns: the Duel's, one Seat per Team ───────────────────────────────

    [Fact]
    public async Task ATurn_OpensOneTile_ThenGuesses_AndAWrongGuessHandsOver()
    {
        var world = new HostWorld();
        var view = await world.Start(teams: 3);
        var first = view.CurrentSeat!.Value;

        view = (await world.Call(s => s.OpenAsync(view.Id, Teacher, world.Tiles[0][0]))).Game;
        Assert.True(view.CanGuess);
        Assert.False(view.CanOpen);
        await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.OpenAsync(view.Id, Teacher, world.Tiles[0][1])));

        var right = await world.Call(s => s.GuessAsync(view.Id, Teacher, "A", "Solution A"));
        Assert.True(right.IsCorrect);
        Assert.Equal(first, right.Game.CurrentSeat);   // a correct Guess keeps the turn
        Assert.Equal(5 + 3, right.Game.Teams[first].Score);

        var wrong = await world.Call(s => s.GuessAsync(view.Id, Teacher, "B", "nope"));
        Assert.False(wrong.IsCorrect);
        Assert.Equal((first + 1) % 3, wrong.Game.CurrentSeat);
        Assert.True(wrong.Game.CanOpen);
    }

    [Fact]
    public async Task Pass_HandsOver_AndTheFinalEndsTheGame()
    {
        var world = new HostWorld();
        var view = await world.Start();
        view = (await world.Call(s => s.OpenAsync(view.Id, Teacher, world.Tiles[1][0]))).Game;
        var passed = (await world.Call(s => s.PassAsync(view.Id, Teacher))).Game;
        Assert.Equal(Next(view), passed.CurrentSeat);

        await world.Call(s => s.OpenAsync(view.Id, Teacher, world.Tiles[2][0]));
        var final = await world.Call(s => s.GuessAsync(view.Id, Teacher, "Final", "the final"));

        Assert.True(final.Game.IsOver);
        Assert.Equal("FinalSolved", final.Game.EndReason);
        Assert.Equal("Final", final.Game.Final.Solution);
        Assert.Null(final.Game.ScreenCode);
    }

    // ── Undo (ADR 0025) ────────────────────────────────────────────────────

    [Fact]
    public async Task Undo_TakesBackTheLastMove_AsAMoveOfItsOwn()
    {
        var world = new HostWorld();
        var view = await world.Start();
        var first = view.CurrentSeat;

        view = (await world.Call(s => s.OpenAsync(view.Id, Teacher, world.Tiles[1][1]))).Game;
        Assert.Contains("opened B2", view.UndoLabel);

        view = await world.Call(s => s.UndoAsync(view.Id, Teacher));

        Assert.False(view.Columns[1].Tiles[1].IsOpen);
        Assert.Null(view.Columns[1].Tiles[1].Text);
        Assert.Equal(first, view.CurrentSeat);
        Assert.True(view.CanOpen);
        Assert.Null(view.UndoLabel);   // an Undo can't be undone
        var moves = world.Game(view.Id).Moves.OrderBy(m => m.Seq).ToList();
        Assert.Equal(new[] { MoveKind.OpenTile, MoveKind.Undo }, moves.Select(m => m.Kind));
        Assert.Equal(1, moves[1].CancelsSeq);
        await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.UndoAsync(view.Id, Teacher)));

        // The intended Tile, and play carries on.
        view = (await world.Call(s => s.OpenAsync(view.Id, Teacher, world.Tiles[1][2]))).Game;
        Assert.True(view.Columns[1].Tiles[2].IsOpen);
        Assert.True(view.CanGuess);
    }

    [Fact]
    public async Task UndoingAWrongGuess_GivesTheTurnBack()
    {
        var world = new HostWorld();
        var view = await world.Start();
        var first = view.CurrentSeat;
        await world.Call(s => s.OpenAsync(view.Id, Teacher, world.Tiles[0][0]));
        var wrong = await world.Call(s => s.GuessAsync(view.Id, Teacher, "A", "Rom"));
        Assert.NotEqual(first, wrong.Game.CurrentSeat);

        view = await world.Call(s => s.UndoAsync(view.Id, Teacher));

        Assert.Equal(first, view.CurrentSeat);
        Assert.True(view.CanGuess);
        var right = await world.Call(s => s.GuessAsync(view.Id, Teacher, "A", "Solution A"));
        Assert.True(right.IsCorrect);
    }

    // ── Clocks (C6) ────────────────────────────────────────────────────────

    [Fact]
    public async Task ATurnThatRunsOut_PassesOnItsOwn_AsManyTimesAsItRanOut()
    {
        var world = new HostWorld();
        var view = await world.Start(teams: 2, gameSeconds: 600, turnSeconds: 30);
        var first = view.CurrentSeat!.Value;
        var started = world.Clock.Now.UtcDateTime;

        world.Clock.Advance(31);
        view = await world.Call(s => s.GetAsync(view.Id, Teacher));
        Assert.Equal(1 - first, view.CurrentSeat);
        Assert.Equal(started.AddSeconds(60), view.TurnDeadlineUtc);

        world.Clock.Advance(60);   // two more turns ran out while nobody looked
        view = await world.Call(s => s.GetAsync(view.Id, Teacher));
        Assert.Equal(1 - first, view.CurrentSeat);
        var expired = world.Game(view.Id).Moves.Where(m => m.Kind == MoveKind.TurnExpired).OrderBy(m => m.Seq).ToList();
        Assert.Equal(new[] { started.AddSeconds(30), started.AddSeconds(60), started.AddSeconds(90) }, expired.Select(m => m.At));
        Assert.NotEmpty(world.Notifier.Sent);   // the screens heard about it
    }

    [Fact]
    public async Task AMoveAfterTheTurnRanOut_IsRefused_AndTheTurnHasMovedOn()
    {
        var world = new HostWorld();
        var view = await world.Start(gameSeconds: 600, turnSeconds: 30);
        await world.Call(s => s.OpenAsync(view.Id, Teacher, world.Tiles[0][0]));
        world.Clock.Advance(31);

        var ex = await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.GuessAsync(view.Id, Teacher, "A", "Solution A")));
        Assert.StartsWith("Time ran out", ex.Message);
        Assert.Equal(Next(view), (await world.Call(s => s.GetAsync(view.Id, Teacher))).CurrentSeat);
    }

    [Fact]
    public async Task WhenTheGameClockRunsOut_TheRoundIsFinished_SoEveryTeamHadAsManyTurns()
    {
        var world = new HostWorld();
        // 3 teams, 300 s, 60 s turns: turn 5 ends at 300 with the game clock; turn 6 still runs,
        // and the game ends at 360 when the turn would come back to the first team.
        var view = await world.Start(teams: 3, gameSeconds: 300, turnSeconds: 60);

        world.Clock.Advance(330);
        view = await world.Call(s => s.GetAsync(view.Id, Teacher));
        Assert.False(view.IsOver);
        Assert.True(view.LastRound);

        world.Clock.Advance(30);
        view = await world.Call(s => s.GetAsync(view.Id, Teacher));
        Assert.True(view.IsOver);
        Assert.Equal("TimeUp", view.EndReason);
        var turnsBySeat = world.Game(view.Id).Moves.Where(m => m.Kind == MoveKind.TurnExpired).GroupBy(m => m.Seat).Select(g => g.Count());
        Assert.All(turnsBySeat, n => Assert.Equal(2, n));
    }

    [Fact]
    public async Task Pause_FreezesBothClocks_AndRefusesMoves_ResumeGivesTheTimeBack()
    {
        var world = new HostWorld();
        var view = await world.Start(gameSeconds: 600, turnSeconds: 30);
        var seat = view.CurrentSeat;
        world.Clock.Advance(10);
        await world.Call(s => s.PauseAsync(view.Id, Teacher));

        world.Clock.Advance(1000);   // the bell, a weekend
        view = await world.Call(s => s.GetAsync(view.Id, Teacher));
        Assert.True(view.IsPaused);
        Assert.Equal(seat, view.CurrentSeat);
        Assert.Equal(20, view.TurnSecondsLeft);
        Assert.Equal(590, view.GameSecondsLeft);
        Assert.False(view.CanOpen);
        await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.OpenAsync(view.Id, Teacher, world.Tiles[0][0])));

        view = await world.Call(s => s.ResumeAsync(view.Id, Teacher));
        Assert.False(view.IsPaused);
        Assert.Equal(world.Clock.Now.UtcDateTime.AddSeconds(20), view.TurnDeadlineUtc);
        Assert.Equal(world.Clock.Now.UtcDateTime.AddSeconds(590), view.GameDeadlineUtc);
    }

    [Fact]
    public async Task WithNoTimeLimit_NothingRunsOut()
    {
        var world = new HostWorld();
        var view = await world.Start();
        world.Clock.Advance(TimeSpan.FromHours(3).TotalSeconds);

        view = await world.Call(s => s.GetAsync(view.Id, Teacher));

        Assert.False(view.Timed);
        Assert.Null(view.TurnDeadlineUtc);
        Assert.Empty(world.Game(view.Id).Moves);
    }

    // ── Ending, again, abandonment ─────────────────────────────────────────

    [Fact]
    public async Task EndGame_EndsItAtOnce_AndRevealsTheBoard()
    {
        var world = new HostWorld();
        var view = await world.Start();
        view = await world.Call(s => s.EndAsync(view.Id, Teacher));

        Assert.True(view.IsOver);
        Assert.Equal("EndedByHost", view.EndReason);
        Assert.Equal("A1", view.Columns[0].Tiles[0].Text);
        Assert.Equal("EndedByHost", (await world.Call(s => s.GetAsync(view.Id, Teacher))).EndReason);   // replay agrees
    }

    [Fact]
    public async Task PlayAgain_KeepsTheTeams_AndTheNextTeamStarts()
    {
        var world = new HostWorld();
        var request = Request(world.QuizId, 3, 600, 60);
        request.Teams[2].Name = "Owls";
        var first = await world.Call(s => s.StartAsync(Teacher, request));

        var again = await world.Call(s => s.PlayAgainAsync(first.Id, Teacher, new PlayHostedGameAgainRequest()));

        Assert.NotEqual(first.Id, again.Id);
        Assert.Equal("EndedByHost", world.Game(first.Id).EndReason?.ToString());
        Assert.Equal(new[] { "Red", "Blue", "Owls" }, again.Teams.Select(t => t.Name));
        Assert.Equal((first.FirstSeat + 1) % 3, again.FirstSeat);
        Assert.Equal(600, again.GameSeconds);
    }

    [Fact]
    public async Task AGameUntouchedForSevenDays_IsEndedAsAbandoned_WithItsScore()
    {
        var world = new HostWorld();
        var view = await world.Start();
        await world.Call(s => s.OpenAsync(view.Id, Teacher, world.Tiles[0][0]));
        await world.Call(s => s.GuessAsync(view.Id, Teacher, "A", "Solution A"));
        await world.Call(s => s.PauseAsync(view.Id, Teacher));

        world.Clock.Advance(TimeSpan.FromDays(6).TotalSeconds);
        Assert.Equal(0, await world.Call(s => s.EndIdleGamesAsync()));
        world.Clock.Advance(TimeSpan.FromDays(1.1).TotalSeconds);
        Assert.Equal(1, await world.Call(s => s.EndIdleGamesAsync()));

        view = await world.Call(s => s.GetAsync(view.Id, Teacher));
        Assert.Equal("Abandoned", view.EndReason);
        Assert.Equal(8, view.Teams.Max(t => t.Score));
    }

    [Fact]
    public async Task TheHostedGamesList_IsTheTeachersOwn()
    {
        var world = new HostWorld();
        await world.Start();
        await world.Start(host: OtherTeacher);

        var mine = await world.Call(s => s.ListAsync(Teacher));

        Assert.Single(mine);
        Assert.Equal("Italian cities", mine[0].QuizTitle);
    }

    // ── Screens (ADR 0024) ─────────────────────────────────────────────────

    [Fact]
    public async Task AScreenCode_FindsTheGame_InAnyCase_UntilItIsReplacedOrTheGameEnds()
    {
        var world = new HostWorld();
        var view = await world.Start();
        view = await world.Call(s => s.IssueScreenCodeAsync(view.Id, Teacher));
        var code = view.ScreenCode!;
        Assert.Equal(8, code.Length);
        Assert.Equal(code, (await world.Call(s => s.IssueScreenCodeAsync(view.Id, Teacher))).ScreenCode);   // stable

        var typed = code.ToLowerInvariant().Insert(4, "-");
        var found = await world.Call(s => s.GetForScreenCodeAsync(typed));
        Assert.Equal(view.Id, found!.Value.GameId);

        world.Screens.TryAddDisplay(view.Id, "projector");
        view = await world.Call(s => s.DisconnectScreensAsync(view.Id, Teacher));
        Assert.NotEqual(code, view.ScreenCode);
        Assert.Equal(new[] { "projector" }, world.Notifier.Revoked);
        Assert.Equal(0, world.Screens.DisplayCount(view.Id));
        Assert.Null(await world.Call(s => s.GetForScreenCodeAsync(code)));

        var fresh = view.ScreenCode!;
        await world.Call(s => s.EndAsync(view.Id, Teacher));
        Assert.Null(await world.Call(s => s.GetForScreenCodeAsync(fresh)));
    }

    [Fact]
    public void ADisplayCap_IsThree()
    {
        var registry = new HostedDisplayRegistry();
        var game = Guid.NewGuid();
        Assert.True(registry.TryAddDisplay(game, "a"));
        Assert.True(registry.TryAddDisplay(game, "b"));
        Assert.True(registry.TryAddDisplay(game, "c"));
        Assert.False(registry.TryAddDisplay(game, "d"));
        registry.Remove("b");
        Assert.True(registry.TryAddDisplay(game, "d"));
    }

    [Fact]
    public async Task TheAnswerKey_IsOnTheController_OnlyWhileADisplayIsConnected()
    {
        var world = new HostWorld();
        var view = await world.Start();
        Assert.Null((await world.Call(s => s.GetAsync(view.Id, Teacher))).AnswerKey);

        world.Screens.TryAddDisplay(view.Id, "projector");
        var withScreen = await world.Call(s => s.GetAsync(view.Id, Teacher));

        Assert.Equal(new[] { "A", "B", "C", "D", "Final" }, withScreen.AnswerKey!.Select(a => a.Target));
        Assert.Equal("Solution C", withScreen.AnswerKey[2].Solution);
        Assert.Equal(1, withScreen.DisplaysConnected);
    }

    /// <summary>
    /// The Display view is exactly as secret as a player's: search the whole JSON for every hidden
    /// thing, so a field added later that leaks fails here without anyone adding an assertion.
    /// </summary>
    [Fact]
    public async Task TheDisplayView_CarriesNothingHidden_EvenWithADisplayConnected()
    {
        var world = new HostWorld();
        var view = await world.Start();
        view = await world.Call(s => s.IssueScreenCodeAsync(view.Id, Teacher));
        world.Screens.TryAddDisplay(view.Id, "projector");
        await world.Call(s => s.OpenAsync(view.Id, Teacher, world.Tiles[0][0]));

        var display = await world.Call(s => s.GetDisplayViewAsync(view.Id));
        var pushed = world.Notifier.Sent.Last();

        foreach (var json in new[] { JsonSerializer.Serialize(display), JsonSerializer.Serialize(pushed) })
        {
            Assert.Contains("A1", json);   // the open Tile
            foreach (var hidden in new[] { "A2", "B1", "D4", "Solution A", "Solution D", "\"Solution\":\"Final\"", "The final", view.ScreenCode! })
                Assert.DoesNotContain(hidden, json);
        }
        Assert.Null(display!.AnswerKey);
        Assert.Null(display.UndoLabel);
        Assert.Null(display.ScreenCode);
    }
}
