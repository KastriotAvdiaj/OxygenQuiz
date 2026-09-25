using Microsoft.EntityFrameworkCore;
using Moq;
using QuizAPI.Exceptions;
using QuizAPI.Repositories;
using QuizAPI.Services.Associations;
using Xunit;
using static QuizAPI.Tests.Multiplayer.DuelWorld;

namespace QuizAPI.Tests.Multiplayer;

/// <summary>
/// After a Duel: each player reviews it on the Solo results page, through the same
/// <see cref="AssociationPlayService.GetAsync"/> (docs/quiz/associations.md §10.5). One game, two
/// seats — so the view has to know which seat is the reader's.
/// </summary>
public class DuelReviewTests
{
    private static async Task<(DuelWorld World, Guid AnaSession, Guid BenSession)> RecordedDuel()
    {
        var w = await new DuelWorld().WithLobby();
        await w.StartAndCountDown();
        await w.Duels.OpenTileAsync(Room, Ana, w.Tile('A', 1));
        await w.Duels.GuessAsync(Room, Ana, "A", "Solution A");     // Ana 8
        await w.Duels.PassAsync(Room, Ana);
        await w.Duels.OpenTileAsync(Room, Ben, w.Tile('B', 1));
        await w.Duels.GuessAsync(Room, Ben, "Final", "the final");  // Ben 36
        await Eventually(() => w.LoopStopped && w.Calls("DuelEnded").Count == 1);

        using var ctx = w.Context();
        var sessions = await ctx.QuizSessions.ToListAsync();
        return (w,
            sessions.Single(s => s.UserId == w.UserIds[Ana]).Id,
            sessions.Single(s => s.UserId == w.UserIds[Ben]).Id);
    }

    private static async Task<T> Call<T>(DuelWorld w, Func<AssociationPlayService, Task<T>> call)
    {
        await using var ctx = w.Context();
        var rules = new Mock<IAssociationRulesProvider>();
        rules.Setup(r => r.GetRulesFor(It.IsAny<int>())).Returns(AssociationRules.Default);
        var service = new AssociationPlayService(new AssociationGameRepository(ctx), new AssociationBoardRepository(ctx), rules.Object, w.Clock);
        return await call(service);
    }

    [Fact]
    public async Task Each_player_reviews_the_duel_from_their_own_seat()
    {
        var (w, anaSession, benSession) = await RecordedDuel();

        var ben = await Call(w, s => s.GetAsync(benSession, w.UserIds[Ben], isAdmin: false));
        var ana = await Call(w, s => s.GetAsync(anaSession, w.UserIds[Ana], isAdmin: false));

        Assert.Equal("Duel", ben.PlayStyle);
        Assert.True(ben.IsOver);
        Assert.Equal("FinalSolved", ben.EndReason);
        Assert.Equal(1, ben.MySeat);
        Assert.Equal(36, ben.Score);
        Assert.Equal(0, ana.MySeat);
        Assert.Equal(8, ana.Score);
        Assert.Equal(1, ben.WinnerSeat);
        Assert.Equal(new[] { (Ana, 8), (Ben, 36) }, ben.Seats.Select(s => (s.Username, s.Score)));
        Assert.Equal(5, ben.Moves.Count);
        Assert.False(ben.CanOpen);
        Assert.False(ben.CanGuess);
        Assert.All(ben.Columns.SelectMany(c => c.Tiles), t => Assert.NotNull(t.Text));
    }

    [Fact]
    public async Task A_duel_can_still_be_reviewed_after_the_opponent_deleted_their_session()
    {
        var (w, anaSession, benSession) = await RecordedDuel();
        await using (var ctx = w.Context())
        {
            await new AssociationGameRepository(ctx).DeleteGamesOfSessionsAsync(new[] { anaSession });
            ctx.QuizSessions.Remove(await ctx.QuizSessions.SingleAsync(s => s.Id == anaSession));
            await ctx.SaveChangesAsync();
        }

        // Replay can't count Seats from the players left: one row is gone. SeatCount says two.
        var ben = await Call(w, s => s.GetAsync(benSession, w.UserIds[Ben], isAdmin: false));

        Assert.Equal(36, ben.Score);
        Assert.Equal(1, ben.WinnerSeat);
        Assert.Equal(2, ben.Seats.Count);
        Assert.Equal(8, ben.Seats[0].Score);
    }

    [Fact]
    public async Task While_boards_are_in_preview_a_player_may_still_review_a_duel_they_played()
    {
        var (w, _, benSession) = await RecordedDuel();

        var ben = await Call(w, s => s.GetOwnDuelAsync(benSession, w.UserIds[Ben]));

        Assert.Equal(1, ben.MySeat);
        Assert.Equal(36, ben.Score);
    }

    [Fact]
    public async Task The_preview_review_is_only_for_ones_own_duel()
    {
        var (w, anaSession, benSession) = await RecordedDuel();

        // Someone else's Duel session: not found, like any session that isn't yours.
        await Assert.ThrowsAsync<NotFoundException>(() => Call(w, s => s.GetOwnDuelAsync(anaSession, w.UserIds[Ben])));

        // A Solo game — even one's own — is not a Duel: still behind the preview gate.
        var solo = await Call(w, s => s.StartAsync(w.UserIds[Ben], w.QuizId, null));
        await Assert.ThrowsAsync<NotFoundException>(() => Call(w, s => s.GetOwnDuelAsync(solo.SessionId, w.UserIds[Ben])));
    }

    [Fact]
    public async Task A_duel_session_takes_no_moves_over_http()
    {
        var (w, _, benSession) = await RecordedDuel();

        var ex = await Assert.ThrowsAsync<AppValidationException>(
            () => Call(w, s => s.OpenTileAsync(benSession, w.UserIds[Ben], w.Tile('C', 1))));
        Assert.Equal("This game is already over.", ex.Message);
    }
}
