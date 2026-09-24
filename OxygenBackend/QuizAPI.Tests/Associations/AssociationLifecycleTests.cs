using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.SubmitAnswerService;
using QuizAPI.Data;
using QuizAPI.Models.Associations;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Services.Associations;
using Xunit;

namespace QuizAPI.Tests.Associations;

/// <summary>
/// Where an Associations game meets the session machinery that was written for Classic: the
/// abandonment clock and the guest and delete paths. Each would have gone wrong silently — a Board
/// session has no questions, so the Classic arithmetic gives it a total timeout of zero, and a
/// deleted session would leave its game behind. (The third meeting point, profile stats, is pinned
/// in UserStatsServiceTests.) See docs/quiz/associations.md, "Playing".
/// </summary>
public class AssociationLifecycleTests
{
    private static readonly Guid Player = PlayWorld.PlayerId;

    private static QuizSessionService SessionService(ApplicationDbContext ctx) =>
        new(ctx,
            NullLogger<QuizSessionService>.Instance,
            new Mock<ISessionAbandonmentService>().Object,
            new Mock<IAnswerGradingService>().Object,
            new Mock<ISubmitAnswerService>().Object,
            new AssociationGameRepository(ctx));

    // ── Abandonment ───────────────────────────────────────────────────────

    [Fact]
    public async Task A_board_session_is_abandonable_only_after_its_deadline_plus_the_grace()
    {
        var world = new PlayWorld();
        var start = await world.Call(s => s.StartAsync(Player, world.QuizId, null));
        var options = new QuizSessionOptions();

        await using var ctx = world.Context();
        var session = await ctx.QuizSessions.Include(s => s.Quiz).SingleAsync(s => s.Id == start.SessionId);
        var sut = new SessionAbandonmentService(ctx, NullLogger<SessionAbandonmentService>.Instance,
            Options.Create(options), new AssociationGameRepository(ctx));

        var deadline = await sut.GetAbandonmentDeadlineAsync(session);

        // Not StartTime + 0, which is what the question arithmetic gives a quiz with no questions.
        Assert.Equal(start.DeadlineUtc!.Value.AddSeconds(options.ActivityBufferSeconds), deadline);

        // The same answer when the caller didn't load the quiz.
        session.Quiz = null!;
        Assert.Equal(deadline, await sut.GetAbandonmentDeadlineAsync(session));
    }

    [Fact]
    public async Task Ending_games_in_bulk_says_TimeUp_at_the_deadline_or_Abandoned_before_it()
    {
        var world = new PlayWorld();
        var first = await world.Call(s => s.StartAsync(Player, world.QuizId, null));
        var second = await world.Call(s => s.StartAsync(PlayWorld.StrangerId, world.QuizId, null));
        var deadline = first.DeadlineUtc!.Value;

        await using (var ctx = world.Context())
            await new AssociationGameRepository(ctx).EndGamesOfSessionsAsync(new[] { first.SessionId }, deadline.AddMinutes(5));
        await using (var ctx = world.Context())
            await new AssociationGameRepository(ctx).EndGamesOfSessionsAsync(new[] { second.SessionId }, deadline.AddSeconds(-1));

        var timedOut = world.Game(first.SessionId);
        Assert.Equal((GameEndReason.TimeUp, deadline), (timedOut.EndReason!.Value, timedOut.EndedAt!.Value));
        Assert.Equal(GameEndReason.Abandoned, world.Game(second.SessionId).EndReason);

        // Replay agrees: the view of the swept game is over, as TimeUp.
        var view = await world.Call(s => s.GetAsync(first.SessionId, Player, false));
        Assert.Equal("TimeUp", view.EndReason);
    }

    // ── Deleting sessions ────────────────────────────────────────────────

    [Fact]
    public async Task Discarding_a_guest_session_deletes_its_game_players_and_moves()
    {
        var world = new PlayWorld();
        var sessionId = Guid.NewGuid();
        var boardId = 0;
        await using (var ctx = world.Context())
        {
            boardId = ctx.AssociationBoards.Single().Id;
            ctx.QuizSessions.Add(new QuizSession
            {
                Id = sessionId, QuizId = world.QuizId, UserId = QuizAPI.Services.GuestAccount.Id,
                IsGuestSession = true, StartTime = DateTime.UtcNow,
            });
            var game = new AssociationGame
            {
                Id = Guid.NewGuid(), BoardId = boardId, PlayStyle = PlayStyle.Solo,
                StartedAt = DateTime.UtcNow, DeadlineUtc = DateTime.UtcNow.AddMinutes(4), RulesJson = AssociationRules.Default.ToJson(),
            };
            game.Players.Add(new AssociationGamePlayer { GameId = game.Id, SessionId = sessionId, Seat = 0 });
            game.Moves.Add(new AssociationGameMove { Seq = 1, Kind = MoveKind.OpenTile, TileId = world.Tiles[0][0], At = DateTime.UtcNow });
            ctx.AssociationGames.Add(game);
            await ctx.SaveChangesAsync();
        }

        await using (var ctx = world.Context())
            Assert.True((await SessionService(ctx).DiscardGuestSessionAsync(sessionId)).IsSuccess);

        await using (var ctx = world.Context())
        {
            Assert.Empty(ctx.QuizSessions);
            Assert.Empty(ctx.AssociationGames);
            Assert.Empty(ctx.AssociationGamePlayers);
            Assert.Empty(ctx.AssociationGameMoves);
            Assert.Single(ctx.AssociationBoards);   // the content is not the play
        }
    }

    [Fact]
    public async Task Deleting_a_solo_session_deletes_its_game()
    {
        var world = new PlayWorld();
        var start = await world.Call(s => s.StartAsync(Player, world.QuizId, null));
        await world.Call(s => s.OpenTileAsync(start.SessionId, Player, world.Tiles[0][0]));

        await using (var ctx = world.Context())
            Assert.True((await SessionService(ctx).DeleteSessionAsync(start.SessionId)).IsSuccess);

        await using (var ctx = world.Context())
        {
            Assert.Empty(ctx.QuizSessions);
            Assert.Empty(ctx.AssociationGames);
            Assert.Empty(ctx.AssociationGameMoves);
        }
    }
}
