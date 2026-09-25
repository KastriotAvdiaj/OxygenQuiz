using System.Text.Json;
using QuizAPI.Models.Associations;
using QuizAPI.Services.Associations;
using Xunit;

namespace QuizAPI.Tests.Associations;

/// <summary>
/// The Duel runner (docs/quiz/associations.md §10): one live Duel, its two Seats, the move log and
/// the view both players see. Pure — every call takes the server's "now", so these tests are the
/// fake clock. The rules themselves are the engine's (DuelRulesTests); what is pinned here is the
/// runner's job around them: who may act, the turn clock, forfeits, the winner and the view.
/// </summary>
public class AssociationDuelTests
{
    private static readonly DateTime T0 = new(2026, 9, 25, 18, 0, 0, DateTimeKind.Utc);
    private static DateTime At(double seconds) => T0.AddSeconds(seconds);

    private const string Ana = "ana";
    private const string Ben = "ben";

    /// <summary>Tile ids are 1–16: A1 is 1, A4 is 4, B1 is 5 … D4 is 16.</summary>
    private static int Tile(char column, int n) => (column - 'A') * 4 + n;

    internal static AssociationBoard Board()
    {
        var board = AssociationBoardMapping.ToEntity(AssociationBoardServiceTests.Board(), quizId: 1, createdInVersion: 1);
        board.Id = 7;
        foreach (var column in board.Columns)
            foreach (var tile in column.Tiles)
                tile.Id = column.Position * 4 + tile.Position + 1;
        return board;
    }

    /// <summary>Ana is Seat 0, Ben Seat 1; <paramref name="firstSeat"/> opens.</summary>
    private static AssociationDuel NewDuel(int firstSeat = 0, AssociationRules? rules = null) =>
        new(Board(), rules ?? AssociationRules.Default, new[] { Ana, Ben }, firstSeat, T0, quizId: 1, quizTitle: "Oxygen final");

    private static void Refused(Action move, string message, AssociationDuel duel)
    {
        var before = duel.Moves.Count;
        var ex = Assert.Throws<DuelMoveException>(move);
        Assert.Equal(message, ex.Message);
        Assert.Equal(before, duel.Moves.Count);
    }

    // ── The start ──────────────────────────────────────────────────────────

    [Fact]
    public void A_new_duel_is_the_first_seats_turn_to_open_a_tile()
    {
        var duel = NewDuel(firstSeat: 1);
        var view = duel.View(T0);

        Assert.Equal(1, view.CurrentSeat);
        Assert.Equal(At(30), view.TurnDeadlineUtc);
        Assert.Equal(30, view.TurnSeconds);
        Assert.Equal(1, view.FirstSeat);
        Assert.True(view.CanOpen);
        Assert.False(view.CanGuess);
        Assert.False(view.CanPass);
        Assert.Equal(new[] { (0, Ana, 0), (1, Ben, 0) }, view.Seats.Select(s => (s.Seat, s.Username, s.Score)));
        Assert.All(view.Columns.SelectMany(c => c.Tiles), t => Assert.Null(t.Text));
        Assert.False(view.IsOver);
    }

    // ── Who may act ────────────────────────────────────────────────────────

    [Fact]
    public void The_seat_whose_turn_it_is_isnt_is_refused_and_nothing_is_recorded()
    {
        var duel = NewDuel(firstSeat: 0);
        Refused(() => duel.Open(Ben, Tile('A', 1), At(1)), "It isn't your turn.", duel);
    }

    [Fact]
    public void Someone_not_seated_in_the_duel_is_refused()
    {
        var duel = NewDuel();
        Refused(() => duel.Open("cleo", Tile('A', 1), At(1)), "You're not playing in this duel.", duel);
    }

    [Fact]
    public void Seats_are_matched_to_usernames_case_insensitively()
    {
        var duel = NewDuel(firstSeat: 0);
        duel.Open("ANA", Tile('A', 1), At(1));
        Assert.Equal(0, Assert.Single(duel.Moves).Seat);
    }

    // ── A turn ─────────────────────────────────────────────────────────────

    [Fact]
    public void Opening_a_tile_shows_it_to_both_and_earns_a_guess_but_not_another_tile()
    {
        var duel = NewDuel();

        var update = duel.Open(Ana, Tile('A', 1), At(2));

        var tile = update.View.Columns[0].Tiles[0];
        Assert.True(tile.IsOpen);
        Assert.Equal("A1", tile.Text);
        Assert.Equal(0, tile.OpenedBySeat);
        Assert.Equal("OpenTile", update.Move.Kind);
        Assert.True(update.View.CanGuess);
        Assert.True(update.View.CanPass);
        Assert.False(update.View.CanOpen);
        Refused(() => duel.Open(Ana, Tile('A', 2), At(3)), "You've already opened a tile this turn.", duel);
    }

    [Fact]
    public void A_turn_cannot_start_with_a_guess_or_a_pass()
    {
        var duel = NewDuel();
        Refused(() => duel.Guess(Ana, "A", "Solution A", At(1)), "Open a tile first.", duel);
        Refused(() => duel.Pass(Ana, At(1)), "Open a tile first.", duel);
    }

    [Fact]
    public void A_wrong_guess_passes_the_turn_and_the_new_turn_gets_a_fresh_clock()
    {
        var duel = NewDuel();
        duel.Open(Ana, Tile('A', 1), At(2));

        var update = duel.Guess(Ana, "A", "Paris", At(10));

        Assert.False(update.IsCorrect);
        Assert.Equal(1, update.View.CurrentSeat);
        Assert.Equal(At(40), update.View.TurnDeadlineUtc);
        Assert.True(update.View.CanOpen);
        // D15: the opponent sees the text of every Guess, right or wrong.
        Assert.Equal("Paris", update.View.Moves.Last().GuessText);
        Assert.Null(update.View.Columns[0].Solution);
    }

    [Fact]
    public void A_correct_guess_scores_keeps_the_turn_and_restarts_the_clock()
    {
        var duel = NewDuel();
        duel.Open(Ana, Tile('A', 1), At(2));

        var update = duel.Guess(Ana, "a", "solution a", At(20));

        Assert.True(update.IsCorrect);
        Assert.Equal(5 + 3, update.Points);
        Assert.Equal(0, update.View.CurrentSeat);
        Assert.Equal(At(50), update.View.TurnDeadlineUtc);
        Assert.True(update.View.CanGuess);
        Assert.False(update.View.CanOpen);
        Assert.Equal(8, update.View.Seats[0].Score);
        Assert.Equal("Solution A", update.View.Columns[0].Solution);
        Assert.All(update.View.Columns[0].Tiles, t => Assert.Equal($"A{t.Position + 1}", t.Text));
    }

    [Fact]
    public void Passing_hands_the_turn_over()
    {
        var duel = NewDuel();
        duel.Open(Ana, Tile('A', 1), At(2));

        var update = duel.Pass(Ana, At(5));

        Assert.Equal("Pass", update.Move.Kind);
        Assert.Equal(1, update.View.CurrentSeat);
        Assert.Equal(At(35), update.View.TurnDeadlineUtc);
    }

    [Fact]
    public void A_guess_needs_a_known_target_and_some_text()
    {
        var duel = NewDuel();
        duel.Open(Ana, Tile('A', 1), At(2));

        Refused(() => duel.Guess(Ana, "E", "x", At(3)), "A guess is for column A, B, C or D, or for the final solution.", duel);
        Refused(() => duel.Guess(Ana, "4", "x", At(3)), "A guess is for column A, B, C or D, or for the final solution.", duel);
        Refused(() => duel.Guess(Ana, "A", "   ", At(3)), "Type a guess first.", duel);
        Refused(() => duel.Guess(Ana, "A", new string('x', AssociationGameLimits.MaxGuessLength + 1), At(3)),
            $"A guess can be at most {AssociationGameLimits.MaxGuessLength} characters.", duel);
    }

    // ── The turn clock ─────────────────────────────────────────────────────

    [Fact]
    public void The_clock_running_out_passes_the_turn_without_opening_anything()
    {
        var duel = NewDuel();

        Assert.Null(duel.ExpireTurnIfDue(At(29.9)));
        var update = duel.ExpireTurnIfDue(At(30));

        Assert.NotNull(update);
        Assert.Equal("TurnExpired", update!.Move.Kind);
        Assert.Equal(0, update.Move.Seat);
        Assert.Equal(1, update.View.CurrentSeat);
        Assert.Equal(At(60), update.View.TurnDeadlineUtc);
        Assert.Empty(duel.State.OpenTiles);
    }

    [Fact]
    public void A_move_that_arrives_after_the_clock_ran_out_does_not_count()
    {
        var duel = NewDuel();
        duel.Open(Ana, Tile('A', 1), At(2));

        Refused(() => duel.Guess(Ana, "A", "Solution A", At(32.5)), "Time's up.", duel);

        // The loop's next tick then records the expiry.
        Assert.Equal("TurnExpired", duel.ExpireTurnIfDue(At(32.6))!.Move.Kind);
    }

    [Fact]
    public void A_correct_guess_moves_the_turn_deadline_so_the_clock_does_not_expire_early()
    {
        var duel = NewDuel();
        duel.Open(Ana, Tile('A', 1), At(2));
        duel.Guess(Ana, "A", "Solution A", At(25));

        Assert.Null(duel.ExpireTurnIfDue(At(31)));
        Assert.Equal(At(55), duel.TurnDeadline);
    }

    // ── The endgame ────────────────────────────────────────────────────────

    /// <summary>Opens all sixteen Tiles, one per turn, each turn passed. Ana opens first.</summary>
    private static (AssociationDuel Duel, double Now) AllTilesOpen()
    {
        var duel = NewDuel();
        var now = 0.0;
        var seat = 0;
        foreach (var column in "ABCD")
            for (var n = 1; n <= 4; n++)
            {
                var who = seat == 0 ? Ana : Ben;
                duel.Open(who, Tile(column, n), At(now += 1));
                duel.Pass(who, At(now += 1));
                seat = 1 - seat;
            }
        return (duel, now);
    }

    [Fact]
    public void Once_every_tile_is_open_each_player_gets_two_turns_of_guessing_then_the_duel_ends()
    {
        var (duel, now) = AllTilesOpen();
        var view = duel.View(At(now));

        // Ben opened the 16th Tile and passed; the endgame starts with Ana's turn.
        Assert.True(view.InEndgame);
        Assert.Equal(0, view.CurrentSeat);
        Assert.False(view.CanOpen);
        Assert.True(view.CanGuess);
        Assert.Equal(1, view.Seats[0].EndgameTurnsLeft);   // after this one
        Assert.Equal(2, view.Seats[1].EndgameTurnsLeft);

        duel.Guess(Ana, "B", "nope", At(now + 1));   // Ana 1 of 2
        duel.Guess(Ben, "B", "nope", At(now + 2));   // Ben 1 of 2
        duel.Guess(Ana, "B", "nope", At(now + 3));   // Ana 2 of 2
        var last = duel.Guess(Ben, "B", "nope", At(now + 4));   // Ben 2 of 2

        Assert.True(last.View.IsOver);
        Assert.Equal("EndgameOver", last.View.EndReason);
        Assert.Null(last.View.CurrentSeat);
        Assert.Null(last.View.TurnDeadlineUtc);
        Assert.Null(last.View.WinnerSeat);   // 0–0
        // Game over: the whole Board is revealed.
        Assert.All(last.View.Columns, c => Assert.NotNull(c.Solution));
        Assert.Equal("Final", last.View.Final.Solution);
    }

    [Fact]
    public void The_endgame_length_is_the_setting()
    {
        var duel = new AssociationDuel(Board(), AssociationRules.Default with { EndgameTurnsPerSeat = 1 },
            new[] { Ana, Ben }, 0, T0, 1, "Oxygen final");
        var now = 0.0;
        var seat = 0;
        foreach (var column in "ABCD")
            for (var n = 1; n <= 4; n++)
            {
                var who = seat == 0 ? Ana : Ben;
                duel.Open(who, Tile(column, n), At(now += 1));
                duel.Pass(who, At(now += 1));
                seat = 1 - seat;
            }

        duel.Pass(Ana, At(now + 1));
        var last = duel.Pass(Ben, At(now + 2));

        Assert.True(last.View.IsOver);
    }

    // ── Ending and the winner ──────────────────────────────────────────────

    [Fact]
    public void Solving_the_final_ends_the_duel_and_the_higher_score_wins()
    {
        var duel = NewDuel();
        duel.Open(Ana, Tile('A', 1), At(1));
        duel.Guess(Ana, "A", "nope", At(2));         // → Ben
        duel.Open(Ben, Tile('B', 1), At(3));
        var end = duel.Guess(Ben, "Final", "the final", At(4));

        Assert.True(end.IsCorrect);
        Assert.True(end.View.IsOver);
        Assert.Equal("FinalSolved", end.View.EndReason);
        Assert.Equal(1, end.View.WinnerSeat);
        Assert.Equal(1, duel.WinnerSeat);
        Assert.Equal(10 + (5 + 3) + (5 + 3) + (5 + 4) + (5 + 4), end.View.Seats[1].Score);
        Refused(() => duel.Open(Ana, Tile('C', 1), At(5)), "This duel is over.", duel);
        Assert.Null(duel.ExpireTurnIfDue(At(500)));
    }

    [Fact]
    public void Equal_scores_are_a_tie_with_no_winner()
    {
        var duel = NewDuel();
        duel.Open(Ana, Tile('A', 1), At(1));
        duel.Guess(Ana, "A", "Solution A", At(2));   // Ana 8
        duel.Pass(Ana, At(3));
        duel.Open(Ben, Tile('B', 1), At(4));
        duel.Guess(Ben, "B", "Solution B", At(5));   // Ben 8
        duel.Pass(Ben, At(6));

        var now = 6.0;
        var seat = 0;
        foreach (var column in "CD")
            for (var n = 1; n <= 4; n++)
            {
                var who = seat == 0 ? Ana : Ben;
                duel.Open(who, Tile(column, n), At(now += 1));
                duel.Pass(who, At(now += 1));
                seat = 1 - seat;
            }
        for (var i = 0; i < 4; i++)
            duel.Pass(i % 2 == 0 ? Ana : Ben, At(now += 1));

        Assert.True(duel.IsOver);
        Assert.Equal(new[] { 8, 8 }, duel.View(At(now)).Seats.Select(s => s.Score));
        Assert.Null(duel.WinnerSeat);
    }

    [Fact]
    public void A_player_who_leaves_forfeits_and_the_one_still_there_wins_whatever_the_score()
    {
        var duel = NewDuel();
        duel.Open(Ana, Tile('A', 1), At(1));
        duel.Guess(Ana, "A", "Solution A", At(2));   // Ana leads 8–0

        var update = duel.Forfeit(Ana, At(3));

        Assert.NotNull(update);
        Assert.True(update!.View.IsOver);
        Assert.Equal("Forfeit", update.View.EndReason);
        Assert.Equal(1, update.View.WinnerSeat);
        Assert.Equal(GameEndReason.Forfeit, duel.Game.EndReason);
        Assert.Equal(At(3), duel.Game.EndedAt);
        Refused(() => duel.Pass(Ben, At(4)), "This duel is over.", duel);
    }

    [Fact]
    public void A_forfeit_by_someone_not_seated_or_after_the_end_changes_nothing()
    {
        var duel = NewDuel();
        Assert.Null(duel.Forfeit("cleo", At(1)));
        Assert.False(duel.IsOver);

        duel.Forfeit(Ben, At(2));
        Assert.Null(duel.Forfeit(Ana, At(3)));
        Assert.Equal(0, duel.WinnerSeat);
    }

    // ── The record ─────────────────────────────────────────────────────────

    [Fact]
    public void The_game_row_is_the_move_log_with_the_seats_the_first_seat_and_the_rules_snapshot()
    {
        var duel = NewDuel(firstSeat: 1);
        duel.Open(Ben, Tile('C', 2), At(1));
        duel.Guess(Ben, "Final", "Rome", At(2));
        duel.ExpireTurnIfDue(At(32));

        var game = duel.Game;
        Assert.Equal(PlayStyle.Duel, game.PlayStyle);
        Assert.Equal(2, game.SeatCount);
        Assert.Equal(1, game.FirstSeat);
        Assert.Equal(7, game.BoardId);
        Assert.Equal(T0, game.StartedAt);
        Assert.Null(game.DeadlineUtc);
        Assert.Equal(AssociationRules.Default.ToJson(), game.RulesJson);
        Assert.Equal(new[] { 1, 2, 3 }, game.Moves.Select(m => m.Seq));
        Assert.Equal(new[] { MoveKind.OpenTile, MoveKind.Guess, MoveKind.TurnExpired }, game.Moves.Select(m => m.Kind));
        Assert.Equal(new[] { 1, 1, 0 }, game.Moves.Select(m => m.Seat));
        Assert.Equal("Rome", game.Moves.ElementAt(1).GuessText);
        Assert.Equal(false, game.Moves.ElementAt(1).IsCorrect);
    }

    [Fact]
    public void Replaying_the_recorded_log_gives_the_same_game()
    {
        var duel = NewDuel(firstSeat: 1);
        duel.Open(Ben, Tile('C', 2), At(1));
        duel.Guess(Ben, "C", "Solution C", At(2));
        duel.Pass(Ben, At(3));
        duel.Open(Ana, Tile('A', 1), At(4));
        duel.Guess(Ana, "Final", "Final", At(5));

        var replayed = AssociationEngine.Replay(
            AssociationEngine.StartDuel(T0, duel.Game.SeatCount, duel.Game.FirstSeat),
            AssociationBoardMapping.ToKey(Board()),
            AssociationRules.FromJson(duel.Game.RulesJson),
            duel.Game.Moves.OrderBy(m => m.Seq).Select(m => new AssociationMove(m.Seat, m.Kind, m.At, m.TileId, m.Target, m.GuessText)));

        Assert.Equal(duel.State.Scores.ToArray(), replayed.Scores.ToArray());
        Assert.Equal(duel.State.EndReason, replayed.EndReason);
    }

    // ── What the view gives away ───────────────────────────────────────────

    [Fact]
    public void While_the_duel_runs_the_view_carries_no_closed_tile_no_unsolved_solution_and_no_other_spelling()
    {
        var duel = NewDuel();
        duel.Open(Ana, Tile('A', 1), At(1));
        duel.Guess(Ana, "B", "wrong", At(2));

        var json = JsonSerializer.Serialize(duel.View(At(3)));

        // As values (":"x"), so property names like "Final" don't count.
        Assert.Contains(":\"A1\"", json);
        foreach (var hidden in new[] { "A2", "B1", "D4", "Solution A", "Solution D", "Final", "The final" })
            Assert.DoesNotContain($":\"{hidden}\"", json);
    }

    [Fact]
    public void After_the_duel_the_view_reveals_the_board_but_never_the_other_spellings()
    {
        var duel = NewDuel();
        duel.Forfeit(Ana, At(1));

        var json = JsonSerializer.Serialize(duel.View(At(2)));

        Assert.Contains(":\"D4\"", json);
        Assert.Contains(":\"Final\"", json);
        Assert.DoesNotContain("The final", json);
    }
}
