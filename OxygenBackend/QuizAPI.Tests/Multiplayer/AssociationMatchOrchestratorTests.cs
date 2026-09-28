using Microsoft.EntityFrameworkCore;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Associations;
using QuizAPI.Models.Quiz;
using QuizAPI.Services.Associations;
using QuizAPI.Services.QuizSessionServices;
using Xunit;
using static QuizAPI.Tests.Multiplayer.DuelWorld;

namespace QuizAPI.Tests.Multiplayer;

/// <summary>
/// The Duel in a lobby, end to end on the server (docs/quiz/associations.md §10): starting, the
/// countdown, turns through the hub-facing methods, the turn clock, forfeits, what is written when
/// it ends — and what isn't when it's interrupted — and handing the lobby back.
///
/// <para>These are also the first tests of a match loop at all (docs/quiz/multiplayer.md §8 used
/// to say there were none): the loop runs on its real background task against a fake clock.</para>
/// </summary>
public class AssociationMatchOrchestratorTests
{
    // ── Starting ────────────────────────────────────────────────────────────

    [Fact]
    public async Task A_duel_needs_exactly_two_players()
    {
        var alone = new DuelWorld();
        await alone.Sessions.CreateSessionAsync(Room, "Ana's lobby", 4, alone.UserIds[Ana], Ana, "ana-1");
        await alone.Sessions.SetQuizAsync(Room, new SelectedQuizView { Id = alone.QuizId.ToString(), Format = "Associations" });
        var one = await Assert.ThrowsAsync<InvalidOperationException>(() => alone.Duels.StartMatchAsync(Room));
        Assert.Equal("An Associations duel is for exactly 2 players.", one.Message);

        var crowd = await new DuelWorld().WithLobby("cleo");
        var three = await Assert.ThrowsAsync<InvalidOperationException>(() => crowd.Duels.StartMatchAsync(Room));
        Assert.Equal("An Associations duel is for exactly 2 players.", three.Message);
        Assert.Null(crowd.Session.MatchCts);
    }

    [Fact]
    public async Task A_second_start_while_the_duel_runs_is_refused()
    {
        var w = await new DuelWorld().WithLobby();
        await w.Duels.StartMatchAsync(Room);

        var again = await Assert.ThrowsAsync<InvalidOperationException>(() => w.Duels.StartMatchAsync(Room));
        Assert.Equal("The match has already started.", again.Message);
    }

    [Fact]
    public async Task Starting_counts_down_then_puts_the_board_up_with_the_seats_in_roster_order()
    {
        var w = await new DuelWorld().WithLobby();

        await w.Duels.StartMatchAsync(Room);
        await Eventually(() => w.Calls("DuelStarting").Count == 1);
        Assert.Equal(3, w.Calls("DuelStarting")[0][0]);
        Assert.Empty(w.Calls("DuelStarted"));   // not before the countdown

        w.Clock.Advance(TimeSpan.FromSeconds(3));
        await Eventually(() => w.Calls("DuelStarted").Count == 1);

        var view = (DuelViewDTO)w.Calls("DuelStarted")[0][0]!;
        Assert.Equal(new[] { Ana, Ben }, view.Seats.Select(s => s.Username));
        Assert.Equal(0, view.CurrentSeat);
        Assert.Equal(w.Clock.GetUtcNow().UtcDateTime.AddSeconds(30), view.TurnDeadlineUtc);
        Assert.Equal("Oxygen final", view.QuizTitle);
    }

    // ── Turns ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task A_move_is_broadcast_to_the_room_and_a_wrong_guess_hands_the_turn_over()
    {
        var w = await new DuelWorld().WithLobby();
        await w.StartAndCountDown();

        await w.Duels.OpenTileAsync(Room, Ana, w.Tile('A', 1));
        await w.Duels.GuessAsync(Room, Ana, "A", "Paris");

        var updates = w.Calls("DuelUpdated").Select(a => (DuelUpdateDTO)a[0]!).ToList();
        Assert.Equal(new[] { "OpenTile", "Guess" }, updates.Select(u => u.Move!.Kind));
        Assert.Equal("A1", updates[0].View.Columns[0].Tiles[0].Text);
        Assert.False(updates[1].IsCorrect);
        Assert.Equal(1, updates[1].View.CurrentSeat);
    }

    [Fact]
    public async Task The_player_whose_turn_it_isnt_is_refused_and_nothing_is_broadcast()
    {
        var w = await new DuelWorld().WithLobby();
        await w.StartAndCountDown();

        var ex = await Assert.ThrowsAsync<DuelMoveException>(() => w.Duels.OpenTileAsync(Room, Ben, w.Tile('A', 1)));

        Assert.Equal("It isn't your turn.", ex.Message);
        Assert.Empty(w.Calls("DuelUpdated"));
    }

    [Fact]
    public async Task Moves_before_the_board_is_up_or_outside_a_duel_are_refused()
    {
        var w = await new DuelWorld().WithLobby();
        var none = await Assert.ThrowsAsync<DuelMoveException>(() => w.Duels.PassAsync(Room, Ana));
        Assert.Equal("There's no duel running.", none.Message);

        await w.Duels.StartMatchAsync(Room);
        var early = await Assert.ThrowsAsync<DuelMoveException>(() => w.Duels.OpenTileAsync(Room, Ana, w.Tile('A', 1)));
        Assert.Equal("The duel hasn't started yet.", early.Message);
    }

    [Fact]
    public async Task When_the_turn_clock_runs_out_the_server_records_it_and_hands_the_turn_over()
    {
        var w = await new DuelWorld().WithLobby();
        await w.StartAndCountDown();
        await w.Duels.OpenTileAsync(Room, Ana, w.Tile('A', 1));

        await w.Advance(29, () => true);
        await Task.Delay(50);
        Assert.Empty(w.Calls("DuelUpdated").Where(a => ((DuelUpdateDTO)a[0]!).Move!.Kind == "TurnExpired"));

        await w.Advance(1.5, () => w.Calls("DuelUpdated").Count == 2);
        var expired = (DuelUpdateDTO)w.Calls("DuelUpdated")[1][0]!;
        Assert.Equal("TurnExpired", expired.Move!.Kind);
        Assert.Equal(0, expired.Move.Seat);
        Assert.Equal(1, expired.View.CurrentSeat);
    }

    // ── The end, and what it leaves behind ───────────────────────────────────

    /// <summary>Ana solves A, then Ben takes the Final on his turn.</summary>
    private static async Task PlayToTheFinal(DuelWorld w)
    {
        await w.Duels.OpenTileAsync(Room, Ana, w.Tile('A', 1));
        await w.Duels.GuessAsync(Room, Ana, "A", "Solution A");   // Ana 8
        await w.Duels.PassAsync(Room, Ana);
        await w.Duels.OpenTileAsync(Room, Ben, w.Tile('B', 1));
        await w.Duels.GuessAsync(Room, Ben, "Final", "the final"); // Ben 10 + 8 + 9 + 9 = 36
    }

    [Fact]
    public async Task A_finished_duel_is_recorded_once_announced_with_the_review_links_and_the_lobby_is_handed_back()
    {
        var w = await new DuelWorld().WithLobby();
        await w.Sessions.SetPlayerReadyAsync(Room, Ana, true);
        await w.StartAndCountDown();
        await PlayToTheFinal(w);

        await Eventually(() => w.Calls("DuelEnded").Count == 1 && w.LoopStopped);
        // More clock, more polls: nothing is written twice.
        w.Clock.Advance(TimeSpan.FromSeconds(60));
        await Task.Delay(100);

        using var ctx = w.Context();
        var match = await ctx.Matches.SingleAsync();
        Assert.Equal(w.QuizId, match.QuizId);
        Assert.Equal(3, match.QuizVersion);
        Assert.Equal(Room, match.RoomCode);
        Assert.Equal(w.UserIds[Ana], match.HostUserId);
        Assert.Equal(w.UserIds[Ben], match.WinnerUserId);
        Assert.NotNull(match.EndedAt);

        var sessions = await ctx.QuizSessions.Where(s => s.MatchId == match.Id).ToListAsync();
        Assert.Equal(2, sessions.Count);
        Assert.All(sessions, s =>
        {
            Assert.Equal(QuizSessionMode.Multiplayer, s.Mode);
            Assert.True(s.IsCompleted);
            Assert.Equal(3, s.QuizVersion);
        });
        Assert.Equal(8, sessions.Single(s => s.UserId == w.UserIds[Ana]).TotalScore);
        Assert.Equal(36, sessions.Single(s => s.UserId == w.UserIds[Ben]).TotalScore);

        var game = await ctx.AssociationGames.Include(g => g.Players).Include(g => g.Moves).SingleAsync();
        Assert.Equal(PlayStyle.Duel, game.PlayStyle);
        Assert.Equal(match.Id, game.MatchId);
        Assert.Equal(2, game.SeatCount);
        Assert.Equal(GameEndReason.FinalSolved, game.EndReason);
        Assert.Equal(5, game.Moves.Count);
        Assert.Equal(
            sessions.OrderBy(s => s.UserId == w.UserIds[Ana] ? 0 : 1).Select(s => s.Id),
            game.Players.OrderBy(p => p.Seat).Select(p => p.SessionId));

        var ended = (DuelViewDTO)w.Calls("DuelEnded")[0][0]!;
        Assert.Equal(1, ended.WinnerSeat);
        Assert.Equal(sessions.Single(s => s.UserId == w.UserIds[Ana]).Id, ended.Seats[0].SessionId);
        Assert.Equal(sessions.Single(s => s.UserId == w.UserIds[Ben]).Id, ended.Seats[1].SessionId);

        // The shared reset: a startable lobby, the Duel gone, and a rematch needs a fresh ready.
        Assert.Null(w.Session.Duel);
        Assert.All(await w.Sessions.GetParticipantsAsync(Room), p => Assert.False(p.IsReady));
    }

    [Fact]
    public async Task A_player_who_leaves_forfeits_the_other_wins_and_it_is_recorded()
    {
        var w = await new DuelWorld().WithLobby();
        await w.StartAndCountDown();
        await w.Duels.OpenTileAsync(Room, Ana, w.Tile('A', 1));
        await w.Duels.GuessAsync(Room, Ana, "A", "Solution A");   // Ana leads 8–0

        await w.Sessions.RemoveParticipantAsync(Room, Ana);
        await w.Duels.PlayerLeftAsync(Room, Ana);

        await Eventually(() => w.Calls("DuelEnded").Count == 1 && w.LoopStopped);
        var ended = (DuelViewDTO)w.Calls("DuelEnded")[0][0]!;
        Assert.Equal("Forfeit", ended.EndReason);
        Assert.Equal(1, ended.WinnerSeat);

        using var ctx = w.Context();
        Assert.Equal(w.UserIds[Ben], (await ctx.Matches.SingleAsync()).WinnerUserId);
        Assert.Equal(GameEndReason.Forfeit, (await ctx.AssociationGames.SingleAsync()).EndReason);
    }

    [Fact]
    public async Task Leaving_during_the_countdown_forfeits_as_soon_as_the_board_is_up()
    {
        var w = await new DuelWorld().WithLobby();
        await w.Duels.StartMatchAsync(Room);
        await Eventually(() => w.Calls("DuelStarting").Count == 1);

        await w.Sessions.RemoveParticipantAsync(Room, Ben);
        await w.Duels.PlayerLeftAsync(Room, Ben);
        w.Clock.Advance(TimeSpan.FromSeconds(3));

        await Eventually(() => w.Calls("DuelEnded").Count == 1 && w.LoopStopped);
        var ended = (DuelViewDTO)w.Calls("DuelEnded")[0][0]!;
        Assert.Equal("Forfeit", ended.EndReason);
        Assert.Equal(0, ended.WinnerSeat);
    }

    [Fact]
    public async Task Someone_who_isnt_seated_leaving_changes_nothing()
    {
        var w = await new DuelWorld().WithLobby();
        await w.StartAndCountDown();

        await w.Duels.PlayerLeftAsync(Room, "cleo");

        Assert.False(w.Session.Duel!.Runner!.IsOver);
    }

    [Fact]
    public async Task An_interrupted_duel_writes_nothing_and_still_hands_the_lobby_back()
    {
        var w = await new DuelWorld().WithLobby();
        await w.StartAndCountDown();
        await w.Duels.OpenTileAsync(Room, Ana, w.Tile('A', 1));

        // What an emptying lobby does: cancel the loop.
        w.Session.MatchCts!.Cancel();

        await Eventually(() => w.LoopStopped);
        w.Clock.Advance(TimeSpan.FromSeconds(1));
        await Task.Delay(50);
        Assert.Empty(w.Calls("DuelEnded"));
        using var ctx = w.Context();
        Assert.Empty(ctx.Matches);
        Assert.Empty(ctx.AssociationGames);
        Assert.Empty(ctx.QuizSessions);
        Assert.Null(w.Session.Duel);
    }

    [Fact]
    public async Task A_rematch_is_opened_by_the_other_player()
    {
        var w = await new DuelWorld().WithLobby();
        await w.StartAndCountDown();
        await PlayToTheFinal(w);
        await Eventually(() => w.LoopStopped);

        await w.StartAndCountDown();
        await Eventually(() => w.Calls("DuelStarted").Count == 2);

        var second = (DuelViewDTO)w.Calls("DuelStarted")[1][0]!;
        Assert.Equal(1, second.CurrentSeat);
        Assert.Equal(Ben, second.Seats[1].Username);
    }

    // ── Catching up ─────────────────────────────────────────────────────────

    [Fact]
    public async Task The_current_view_is_there_for_a_player_who_reconnects_mid_duel_and_gone_after()
    {
        var w = await new DuelWorld().WithLobby();
        Assert.Null(await w.Duels.CurrentViewAsync(Room));

        await w.StartAndCountDown();
        await w.Duels.OpenTileAsync(Room, Ana, w.Tile('A', 1));

        var view = await w.Duels.CurrentViewAsync(Room);
        Assert.NotNull(view);
        Assert.True(view!.Columns[0].Tiles[0].IsOpen);

        await PlayToTheFinalFromOpen(w);
        await Eventually(() => w.LoopStopped);
        Assert.Null(await w.Duels.CurrentViewAsync(Room));
    }

    private static async Task PlayToTheFinalFromOpen(DuelWorld w) =>
        await w.Duels.GuessAsync(Room, Ana, "Final", "Final");
}
