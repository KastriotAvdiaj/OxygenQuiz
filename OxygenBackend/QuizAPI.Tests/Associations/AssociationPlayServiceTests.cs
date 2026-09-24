using QuizAPI.DTOs.Quiz;
using QuizAPI.Exceptions;
using QuizAPI.Models.Quiz;
using QuizAPI.Services.Associations;
using Xunit;

namespace QuizAPI.Tests.Associations;

/// <summary>
/// Solo play over the real repositories and an in-memory database (docs/quiz/associations.md,
/// "Playing"). Each service call runs on a fresh DbContext, like an HTTP request, so every
/// assertion is about what was <i>saved</i> — the move log — and what replaying it gives.
///
/// <para>Not covered here: two requests racing to append the same move. The unique
/// <c>(GameId, Seq)</c> index is what stops that, and InMemory doesn't enforce unique indexes;
/// the service's handling of the violation (a 409) is the plain catch in MoveAsync.</para>
/// </summary>
public class AssociationPlayServiceTests
{
    private static readonly Guid Player = PlayWorld.PlayerId;

    // ── Starting ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Start_creates_a_session_a_game_and_a_seat_with_the_deadline_and_the_rules_snapshot()
    {
        var world = new PlayWorld();
        var view = await world.Call(s => s.StartAsync(Player, world.QuizId, null));

        var session = world.Session(view.SessionId);
        Assert.Equal(Player, session.UserId);
        Assert.Equal(1, session.QuizVersion);
        Assert.False(session.IsCompleted);

        var game = world.Game(view.SessionId);
        Assert.Equal(PlayStyle.Solo, game.PlayStyle);
        Assert.Equal(world.Clock.Now.UtcDateTime.AddSeconds(PlayWorld.BoardSeconds), game.DeadlineUtc);
        Assert.Equal(AssociationRules.Default.ToJson(), game.RulesJson);
        Assert.Equal(0, Assert.Single(game.Players).Seat);
        Assert.Empty(game.Moves);

        Assert.False(view.Resumed);
        Assert.False(view.IsOver);
        Assert.Equal(PlayWorld.BoardSeconds, view.BoardSeconds);
        Assert.All(view.Columns.SelectMany(c => c.Tiles), t => { Assert.False(t.IsOpen); Assert.Null(t.Text); });
    }

    [Fact]
    public async Task Starting_again_while_a_game_is_running_returns_that_game()
    {
        var world = new PlayWorld();
        var first = await world.Call(s => s.StartAsync(Player, world.QuizId, null));
        await world.Call(s => s.OpenTileAsync(first.SessionId, Player, world.Tiles[0][0]));
        world.Clock.Advance(30);

        var again = await world.Call(s => s.StartAsync(Player, world.QuizId, null));

        Assert.True(again.Resumed);
        Assert.Equal(first.SessionId, again.SessionId);
        Assert.Equal("A1", again.Columns[0].Tiles[0].Text);   // the move made before leaving is still there
    }

    [Fact]
    public async Task Starting_after_the_old_game_ran_out_settles_it_as_TimeUp_and_starts_a_new_one()
    {
        var world = new PlayWorld();
        var first = await world.Call(s => s.StartAsync(Player, world.QuizId, null));
        await world.Call(s => s.OpenTileAsync(first.SessionId, Player, world.Tiles[1][0]));   // earns the Guess
        await world.Call(s => s.GuessAsync(first.SessionId, Player, "A", "Solution A"));
        world.Clock.Advance(PlayWorld.BoardSeconds + 1);

        var second = await world.Call(s => s.StartAsync(Player, world.QuizId, null));

        Assert.NotEqual(first.SessionId, second.SessionId);
        Assert.False(second.Resumed);

        var old = world.Session(first.SessionId);
        Assert.True(old.IsCompleted);
        Assert.Null(old.AbandonmentReason);   // ran out of time; nobody abandoned it
        Assert.Equal(first.DeadlineUtc, old.EndTime);
        Assert.Equal(9, old.TotalScore);      // 5 + 4 closed tiles — kept
        Assert.Equal(GameEndReason.TimeUp, world.Game(first.SessionId).EndReason);
    }

    [Theory]
    [InlineData(QuizStatus.Draft)]
    [InlineData(QuizStatus.Unlisted)]
    public async Task A_stranger_cant_start_a_quiz_they_may_not_play(QuizStatus status)
    {
        var world = new PlayWorld(status, shareToken: "token");
        await Assert.ThrowsAsync<NotFoundException>(() => world.Call(s => s.StartAsync(PlayWorld.StrangerId, world.QuizId, null)));
    }

    [Fact]
    public async Task An_unlisted_quiz_starts_with_its_share_token()
    {
        var world = new PlayWorld(QuizStatus.Unlisted, shareToken: "token");
        var view = await world.Call(s => s.StartAsync(PlayWorld.StrangerId, world.QuizId, "token"));
        Assert.False(view.IsOver);
    }

    [Fact]
    public async Task A_classic_quiz_is_refused_after_the_access_check()
    {
        var world = new PlayWorld(format: QuizFormat.Classic);
        var error = await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.StartAsync(Player, world.QuizId, null)));
        Assert.Contains("regular", error.Message);

        // A stranger on a Draft Classic quiz learns nothing about its format.
        var draft = new PlayWorld(QuizStatus.Draft, QuizFormat.Classic);
        await Assert.ThrowsAsync<NotFoundException>(() => draft.Call(s => s.StartAsync(PlayWorld.StrangerId, draft.QuizId, null)));
    }

    // ── Moves ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task Opening_a_tile_reveals_only_that_tile_and_is_recorded()
    {
        var world = new PlayWorld();
        var start = await world.Call(s => s.StartAsync(Player, world.QuizId, null));

        var result = await world.Call(s => s.OpenTileAsync(start.SessionId, Player, world.Tiles[1][2]));

        var tile = result.Game.Columns[1].Tiles[2];
        Assert.True(tile.IsOpen);
        Assert.Equal("B3", tile.Text);
        Assert.Equal(0, tile.OpenedBySeat);
        Assert.Single(result.Game.Columns.SelectMany(c => c.Tiles), t => t.IsOpen);

        var move = Assert.Single(world.Game(start.SessionId).Moves);
        Assert.Equal((1, MoveKind.OpenTile, world.Tiles[1][2]), (move.Seq, move.Kind, move.TileId!.Value));
    }

    [Fact]
    public async Task Refused_moves_are_errors_and_are_not_recorded()
    {
        var world = new PlayWorld();
        var start = await world.Call(s => s.StartAsync(Player, world.QuizId, null));
        await world.Call(s => s.OpenTileAsync(start.SessionId, Player, world.Tiles[0][0]));

        await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.OpenTileAsync(start.SessionId, Player, world.Tiles[0][0])));
        await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.OpenTileAsync(start.SessionId, Player, 999_999)));
        await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.GuessAsync(start.SessionId, Player, "4", "x")));
        await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.GuessAsync(start.SessionId, Player, "E", "x")));
        await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.GuessAsync(start.SessionId, Player, "A", "   ")));
        await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.GuessAsync(start.SessionId, Player, "A", new string('x', 201))));

        Assert.Single(world.Game(start.SessionId).Moves);
    }

    [Fact]
    public async Task A_wrong_guess_is_free_recorded_and_reveals_nothing()
    {
        var world = new PlayWorld();
        var start = await world.Call(s => s.StartAsync(Player, world.QuizId, null));

        await world.Call(s => s.OpenTileAsync(start.SessionId, Player, world.Tiles[1][0]));   // earns the Guess
        var result = await world.Call(s => s.GuessAsync(start.SessionId, Player, "c", "  Rome  "));

        Assert.False(result.IsCorrect);
        Assert.Equal(0, result.Points);
        Assert.Null(result.Game.Columns[2].Solution);
        Assert.False(result.Game.IsOver);

        var move = world.Game(start.SessionId).Moves.OrderBy(m => m.Seq).Last();
        Assert.Equal((2, "Rome", false, GuessTarget.C), (move.Seq, move.GuessText, move.IsCorrect!.Value, move.Target!.Value));

        // The Guess is spent: the next one needs another Tile.
        await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.GuessAsync(start.SessionId, Player, "C", "Milan")));
    }

    [Fact]
    public async Task A_correct_column_scores_its_closed_tiles_opens_the_column_and_updates_the_session()
    {
        var world = new PlayWorld();
        var start = await world.Call(s => s.StartAsync(Player, world.QuizId, null));
        await world.Call(s => s.OpenTileAsync(start.SessionId, Player, world.Tiles[3][0]));

        var result = await world.Call(s => s.GuessAsync(start.SessionId, Player, "D", "solution d"));

        Assert.True(result.IsCorrect);
        Assert.Equal(5 + 3, result.Points);
        Assert.Equal(new[] { "D" }, result.SolvedColumns);
        var column = result.Game.Columns[3];
        Assert.True(column.Solved);
        Assert.Equal("Solution D", column.Solution);
        Assert.All(column.Tiles, t => Assert.NotNull(t.Text));
        Assert.Null(column.Tiles[1].OpenedBySeat);   // revealed by the solve, not opened by hand
        Assert.Equal(8, result.Game.Score);
        Assert.Equal(8, world.Session(start.SessionId).TotalScore);
        Assert.False(world.Session(start.SessionId).IsCompleted);
    }

    [Fact]
    public async Task The_final_ends_the_game_collects_the_rest_and_reveals_the_board()
    {
        var world = new PlayWorld();
        var start = await world.Call(s => s.StartAsync(Player, world.QuizId, null));
        await world.Call(s => s.OpenTileAsync(start.SessionId, Player, world.Tiles[3][3]));   // earns the Guess
        await world.Call(s => s.GuessAsync(start.SessionId, Player, "A", "Solution A"));   // 9
        world.Clock.Advance(10);

        var result = await world.Call(s => s.GuessAsync(start.SessionId, Player, "Final", "the final"));

        // 10 + B and C untouched (9 each) + D with one Tile open (8).
        Assert.Equal(10 + 26, result.Points);
        Assert.True(result.FinalSolved);
        Assert.True(result.Game.IsOver);
        Assert.Equal("FinalSolved", result.Game.EndReason);
        Assert.Equal(9 + 36, result.Game.Score);
        Assert.Equal("Final", result.Game.Final.Solution);   // the canonical text, not the spelling typed
        Assert.All(result.Game.Columns, c => Assert.NotNull(c.Solution));

        var session = world.Session(start.SessionId);
        Assert.True(session.IsCompleted);
        Assert.Equal(45, session.TotalScore);
        Assert.Equal(world.Clock.Now.UtcDateTime, session.EndTime);
        Assert.Equal(GameEndReason.FinalSolved, world.Game(start.SessionId).EndReason);

        await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.OpenTileAsync(start.SessionId, Player, world.Tiles[0][0])));
    }

    [Fact]
    public async Task Giving_up_ends_the_game_keeps_the_points_and_reveals_the_board()
    {
        var world = new PlayWorld();
        var start = await world.Call(s => s.StartAsync(Player, world.QuizId, null));
        await world.Call(s => s.OpenTileAsync(start.SessionId, Player, world.Tiles[0][0]));   // earns the Guess
        await world.Call(s => s.GuessAsync(start.SessionId, Player, "B", "Solution B"));

        var view = await world.Call(s => s.GiveUpAsync(start.SessionId, Player));

        Assert.True(view.IsOver);
        Assert.Equal("GaveUp", view.EndReason);
        Assert.Equal(9, view.Score);
        Assert.All(view.Columns.SelectMany(c => c.Tiles), t => Assert.NotNull(t.Text));
        Assert.Equal(9, world.Session(start.SessionId).TotalScore);
        Assert.True(world.Session(start.SessionId).IsCompleted);
    }

    [Fact]
    public async Task The_view_says_what_the_player_may_do_next()
    {
        var world = new PlayWorld();
        var start = await world.Call(s => s.StartAsync(Player, world.QuizId, null));
        Assert.True(start.CanOpen);
        Assert.False(start.CanGuess);   // a Tile first

        AssociationGameViewDTO view = start;
        foreach (var tile in world.Tiles.SelectMany(t => t))
            view = (await world.Call(s => s.OpenTileAsync(start.SessionId, Player, tile))).Game;
        Assert.False(view.CanOpen);
        Assert.True(view.CanGuess);
        Assert.False(view.InEndgame);

        view = (await world.Call(s => s.GuessAsync(start.SessionId, Player, "A", "nope"))).Game;
        Assert.True(view.InEndgame);
        Assert.True(view.CanGuess);
        Assert.Equal(2, view.EndgameTriesLeft);

        view = (await world.Call(s => s.GuessAsync(start.SessionId, Player, "A", "nope"))).Game;
        Assert.Equal(1, view.EndgameTriesLeft);
        view = (await world.Call(s => s.GuessAsync(start.SessionId, Player, "A", "nope"))).Game;
        Assert.True(view.IsOver);
        Assert.Equal("EndgameOver", view.EndReason);
        Assert.False(view.CanGuess);
    }

    // ── The clock ──────────────────────────────────────────────────────────

    [Fact]
    public async Task A_move_after_the_deadline_doesnt_count_and_the_game_ends_as_TimeUp_at_the_deadline()
    {
        var world = new PlayWorld();
        var start = await world.Call(s => s.StartAsync(Player, world.QuizId, null));
        await world.Call(s => s.OpenTileAsync(start.SessionId, Player, world.Tiles[1][0]));   // earns the Guess
        await world.Call(s => s.GuessAsync(start.SessionId, Player, "A", "Solution A"));
        world.Clock.Advance(PlayWorld.BoardSeconds);   // exactly the deadline: already too late

        var result = await world.Call(s => s.GuessAsync(start.SessionId, Player, "Final", "Final"));

        Assert.Null(result.IsCorrect);
        Assert.Equal(0, result.Points);
        Assert.True(result.Game.IsOver);
        Assert.Equal("TimeUp", result.Game.EndReason);
        Assert.Equal(9, result.Game.Score);

        var game = world.Game(start.SessionId);
        Assert.Equal(2, game.Moves.Count);   // the Tile and the Guess; the late one isn't in the log
        Assert.Equal(start.DeadlineUtc, game.EndedAt);
        var session = world.Session(start.SessionId);
        Assert.True(session.IsCompleted);
        Assert.Equal(start.DeadlineUtc, session.EndTime);
        Assert.Equal(9, session.TotalScore);
    }

    [Fact]
    public async Task Coming_back_inside_the_deadline_resumes_and_after_it_shows_the_finished_board()
    {
        var world = new PlayWorld();
        var start = await world.Call(s => s.StartAsync(Player, world.QuizId, null));
        await world.Call(s => s.OpenTileAsync(start.SessionId, Player, world.Tiles[2][1]));

        world.Clock.Advance(200);
        var inside = await world.Call(s => s.GetAsync(start.SessionId, Player, false));
        Assert.False(inside.IsOver);
        Assert.Equal("C2", inside.Columns[2].Tiles[1].Text);
        Assert.Equal(world.Clock.Now.UtcDateTime, inside.ServerNow);

        world.Clock.Advance(3600);
        var after = await world.Call(s => s.GetAsync(start.SessionId, Player, false));
        Assert.True(after.IsOver);
        Assert.Equal("TimeUp", after.EndReason);
        Assert.Equal(GameEndReason.TimeUp, world.Game(start.SessionId).EndReason);   // settled, not just displayed
        Assert.True(world.Session(start.SessionId).IsCompleted);
    }

    [Fact]
    public async Task A_game_is_scored_by_its_own_snapshot_not_by_rules_changed_since()
    {
        var world = new PlayWorld();
        var start = await world.Call(s => s.StartAsync(Player, world.QuizId, null));
        world.Rules = AssociationRules.Default with { ColumnBase = 50 };

        await world.Call(s => s.OpenTileAsync(start.SessionId, Player, world.Tiles[1][0]));   // earns the Guess
        var result = await world.Call(s => s.GuessAsync(start.SessionId, Player, "A", "Solution A"));

        Assert.Equal(9, result.Points);
    }

    // ── Access ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Someone_elses_game_is_not_found_and_an_admin_may_read_it_but_not_move_in_it()
    {
        var world = new PlayWorld();
        var start = await world.Call(s => s.StartAsync(Player, world.QuizId, null));

        await Assert.ThrowsAsync<NotFoundException>(() => world.Call(s => s.GetAsync(start.SessionId, PlayWorld.StrangerId, false)));
        await Assert.ThrowsAsync<NotFoundException>(() => world.Call(s => s.OpenTileAsync(start.SessionId, PlayWorld.StrangerId, world.Tiles[0][0])));
        await Assert.ThrowsAsync<NotFoundException>(() => world.Call(s => s.RestartAsync(start.SessionId, PlayWorld.StrangerId, null)));

        var asAdmin = await world.Call(s => s.GetAsync(start.SessionId, PlayWorld.StrangerId, isAdmin: true));
        Assert.Equal(start.SessionId, asAdmin.SessionId);
        await Assert.ThrowsAsync<NotFoundException>(() => world.Call(s => s.GiveUpAsync(start.SessionId, PlayWorld.StrangerId)));
        Assert.Empty(world.Game(start.SessionId).Moves);
    }

    [Fact]
    public async Task A_classic_session_id_is_not_found_here()
    {
        var world = new PlayWorld();
        var classic = Guid.NewGuid();
        await using (var ctx = world.Context())
        {
            ctx.QuizSessions.Add(new QuizSession { Id = classic, QuizId = world.QuizId, UserId = Player, StartTime = DateTime.UtcNow });
            await ctx.SaveChangesAsync();
        }
        await Assert.ThrowsAsync<NotFoundException>(() => world.Call(s => s.GetAsync(classic, Player, false)));
    }

    // ── Restart ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Restart_abandons_a_running_game_and_starts_a_fresh_one()
    {
        var world = new PlayWorld();
        var first = await world.Call(s => s.StartAsync(Player, world.QuizId, null));
        await world.Call(s => s.OpenTileAsync(first.SessionId, Player, world.Tiles[0][0]));

        var fresh = await world.Call(s => s.RestartAsync(first.SessionId, Player, null));

        Assert.NotEqual(first.SessionId, fresh.SessionId);
        Assert.All(fresh.Columns.SelectMany(c => c.Tiles), t => Assert.False(t.IsOpen));
        var old = world.Session(first.SessionId);
        Assert.True(old.IsCompleted);
        Assert.Equal(AbandonmentReason.UserInitiated, old.AbandonmentReason);
        Assert.Equal(GameEndReason.Abandoned, world.Game(first.SessionId).EndReason);
    }

    [Fact]
    public async Task A_refused_restart_leaves_the_running_game_alone()
    {
        // An Unlisted board started with its share token, restarted without it.
        var world = new PlayWorld(QuizStatus.Unlisted, shareToken: "token");
        var first = await world.Call(s => s.StartAsync(PlayWorld.StrangerId, world.QuizId, "token"));

        await Assert.ThrowsAsync<NotFoundException>(() => world.Call(s => s.RestartAsync(first.SessionId, PlayWorld.StrangerId, null)));

        Assert.False(world.Session(first.SessionId).IsCompleted);
        Assert.Null(world.Game(first.SessionId).EndReason);
    }

    [Fact]
    public async Task Restart_of_a_finished_game_leaves_it_as_it_ended()
    {
        var world = new PlayWorld();
        var first = await world.Call(s => s.StartAsync(Player, world.QuizId, null));
        await world.Call(s => s.GiveUpAsync(first.SessionId, Player));

        var fresh = await world.Call(s => s.RestartAsync(first.SessionId, Player, null));

        Assert.NotEqual(first.SessionId, fresh.SessionId);
        Assert.Null(world.Session(first.SessionId).AbandonmentReason);
        Assert.Equal(GameEndReason.GaveUp, world.Game(first.SessionId).EndReason);
    }
}
