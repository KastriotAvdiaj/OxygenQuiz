using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.SubmitAnswerService;
using QuizAPI.Data;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Tests.TestSupport;
using Xunit;

// Moq has a `Match` type of its own (its argument-matcher base), and this file uses both libraries.
// Aliasing rather than fully qualifying every use: the domain type is the subject here, and it
// should read as `Match` everywhere it appears.
using Match = QuizAPI.Models.Quiz.Match;

namespace QuizAPI.Tests.Playing;

/// <summary>
/// The two reads over a recorded match: who played it, and who is allowed to see that.
///
/// <para><b>Why these and not the match loop.</b> `MatchOrchestrator` is a singleton holding a hub
/// context, a scope factory and a three-second countdown, so testing the WRITE means first deciding
/// how much of that to fake — noted as open in docs/quiz/multiplayer.md §8. These two are plain
/// queries over the rows it leaves behind, and they carry the rules most likely to be got wrong
/// later: the peer check is the only place in this service where "not yours" still means "yes", and
/// the roster is where a `TimedOut` row and a `NotAnswered` row stop meaning the same thing.</para>
///
/// <para>Real repository over an in-memory database, because the claims are about queries. The
/// three collaborators the constructor wants are mocked: nothing here reaches grading, submission
/// or abandonment.</para>
/// </summary>
public class MatchReadsTests
{
    private static ApplicationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options,
            new TestCurrentUserService());

    private static QuizSessionService SutFor(ApplicationDbContext ctx) =>
        new(ctx,
            NullLogger<QuizSessionService>.Instance,
            new Mock<ISessionAbandonmentService>().Object,
            new Mock<IAnswerGradingService>().Object,
            new Mock<ISubmitAnswerService>().Object);

    private static User AddUser(ApplicationDbContext ctx, string name)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = name,
            ImmutableName = name.ToLowerInvariant(),
            Email = $"{name}@example.com",
            PasswordHash = "hash",
            ProfileImageUrl = string.Empty,
            EmailConfirmed = true,
        };
        ctx.Users.Add(user);
        ctx.SaveChanges();
        return user;
    }

    private static Quiz AddQuiz(ApplicationDbContext ctx)
    {
        var quiz = new Quiz { Title = "Capitals", UserId = AddUser(ctx, "author").Id };
        ctx.Quizzes.Add(quiz);
        ctx.SaveChanges();
        return quiz;
    }

    /// <param name="answerStatuses">
    /// One per question, in order — what this player's rows say. `TimedOut` is "was here and said
    /// nothing"; `NotAnswered` is "the round happened without them".
    /// </param>
    private static QuizSession AddSession(
        ApplicationDbContext ctx,
        Quiz quiz,
        User user,
        int totalScore,
        Guid? matchId,
        params AnswerStatus[] answerStatuses)
    {
        var session = new QuizSession
        {
            Id = Guid.NewGuid(),
            QuizId = quiz.Id,
            UserId = user.Id,
            StartTime = DateTime.UtcNow.AddMinutes(-2),
            EndTime = DateTime.UtcNow,
            TotalScore = totalScore,
            IsCompleted = true,
            Mode = matchId is null ? QuizSessionMode.SinglePlayer : QuizSessionMode.Multiplayer,
            MatchId = matchId,
        };

        foreach (var status in answerStatuses)
        {
            session.UserAnswers.Add(new UserAnswer
            {
                Status = status,
                Score = status == AnswerStatus.Correct ? 100 : 0,
                QuestionStartTime = session.StartTime,
            });
        }

        ctx.QuizSessions.Add(session);
        ctx.SaveChanges();
        return session;
    }

    private static Match AddMatch(ApplicationDbContext ctx, Quiz quiz, User host, Guid? winnerUserId)
    {
        var match = new Match
        {
            Id = Guid.NewGuid(),
            QuizId = quiz.Id,
            QuizVersion = 1,
            RoomCode = "4ZVWJX",
            HostUserId = host.Id,
            StartedAt = DateTime.UtcNow.AddMinutes(-2),
            EndedAt = DateTime.UtcNow,
            WinnerUserId = winnerUserId,
        };
        ctx.Matches.Add(match);
        ctx.SaveChanges();
        return match;
    }

    // ---- the roster ---------------------------------------------------------------------------

    /// <summary>
    /// The common case by far, and the reason this returns an empty list rather than a 404: the
    /// results page asks on every render, and most sessions are single player.
    /// </summary>
    [Fact]
    public async Task ASinglePlayerSessionHasNoMatchPlayers()
    {
        using var ctx = NewContext();
        var quiz = AddQuiz(ctx);
        var session = AddSession(ctx, quiz, AddUser(ctx, "solo"), 500, matchId: null,
            AnswerStatus.Correct, AnswerStatus.Incorrect);

        var result = await SutFor(ctx).GetMatchPlayersAsync(session.Id);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Data!);
    }

    /// <summary>
    /// Scoreboard order, and the winner flag — which comes off the stored `Match.WinnerUserId`
    /// rather than being recomputed here, so a tie stays a tie.
    /// </summary>
    [Fact]
    public async Task AMatchListsItsPlayersInScoreboardOrder()
    {
        using var ctx = NewContext();
        var quiz = AddQuiz(ctx);
        var winner = AddUser(ctx, "KaLoti");
        var runnerUp = AddUser(ctx, "admin");
        var match = AddMatch(ctx, quiz, winner, winnerUserId: winner.Id);

        AddSession(ctx, quiz, runnerUp, 3678, match.Id,
            AnswerStatus.Correct, AnswerStatus.Incorrect);
        AddSession(ctx, quiz, winner, 3782, match.Id,
            AnswerStatus.Correct, AnswerStatus.Correct);

        var players = (await SutFor(ctx).GetMatchPlayersAsync(
            ctx.QuizSessions.First(s => s.UserId == winner.Id).Id)).Data!;

        Assert.Equal(new[] { "KaLoti", "admin" }, players.Select(p => p.Username).ToArray());
        Assert.True(players[0].IsWinner);
        Assert.False(players[1].IsWinner);
        Assert.Equal(2, players[0].CorrectAnswers);
        Assert.Equal(1, players[1].CorrectAnswers);
    }

    /// <summary>
    /// The distinction the whole answer-row design rests on: a player who sat a question out is not
    /// a player who left. Collapse the two statuses and the review screen can only show blanks.
    /// </summary>
    [Fact]
    public async Task OnlyAPlayerWithNotAnsweredRowsCountsAsHavingLeft()
    {
        using var ctx = NewContext();
        var quiz = AddQuiz(ctx);
        var stayed = AddUser(ctx, "stayed");
        var left = AddUser(ctx, "left");
        var match = AddMatch(ctx, quiz, stayed, winnerUserId: stayed.Id);

        // Present throughout — one of them simply ran the clock down.
        var stayedSession = AddSession(ctx, quiz, stayed, 900, match.Id,
            AnswerStatus.Correct, AnswerStatus.TimedOut, AnswerStatus.Correct);
        // Answered the first, then the room carried on without them.
        AddSession(ctx, quiz, left, 300, match.Id,
            AnswerStatus.Correct, AnswerStatus.NotAnswered, AnswerStatus.NotAnswered);

        var players = (await SutFor(ctx).GetMatchPlayersAsync(stayedSession.Id)).Data!;

        Assert.False(players.Single(p => p.Username == "stayed").LeftEarly);
        Assert.True(players.Single(p => p.Username == "left").LeftEarly);
    }

    [Fact]
    public async Task AnUnknownSessionIsNotFound()
    {
        using var ctx = NewContext();

        var result = await SutFor(ctx).GetMatchPlayersAsync(Guid.NewGuid());

        Assert.False(result.IsSuccess);
    }

    // ---- who may look -------------------------------------------------------------------------

    /// <summary>
    /// The whole point of the peer rule: you may read a session you do not own, because you played
    /// against it.
    /// </summary>
    [Fact]
    public async Task APlayerMayReadAnotherPlayersSessionFromTheSameMatch()
    {
        using var ctx = NewContext();
        var quiz = AddQuiz(ctx);
        var me = AddUser(ctx, "me");
        var them = AddUser(ctx, "them");
        var match = AddMatch(ctx, quiz, me, winnerUserId: me.Id);

        AddSession(ctx, quiz, me, 900, match.Id, AnswerStatus.Correct);
        var theirs = AddSession(ctx, quiz, them, 300, match.Id, AnswerStatus.Incorrect);

        Assert.True(await SutFor(ctx).IsMatchPeerAsync(theirs.Id, me.Id));
    }

    /// <summary>
    /// The safety net. If this ever starts passing, "we played together" has stopped being the
    /// condition and any signed-in user can read any match session.
    /// </summary>
    [Fact]
    public async Task SomeoneWhoWasNotInTheMatchMayNot()
    {
        using var ctx = NewContext();
        var quiz = AddQuiz(ctx);
        var player = AddUser(ctx, "player");
        var stranger = AddUser(ctx, "stranger");
        var match = AddMatch(ctx, quiz, player, winnerUserId: player.Id);

        var theirs = AddSession(ctx, quiz, player, 900, match.Id, AnswerStatus.Correct);

        Assert.False(await SutFor(ctx).IsMatchPeerAsync(theirs.Id, stranger.Id));
    }

    /// <summary>
    /// A single-player session has no MatchId, so it matches nothing in the peer query — this rule
    /// can never widen access to solo play, which is the property worth pinning.
    /// </summary>
    [Fact]
    public async Task ASinglePlayerSessionIsNeverPeerReadable()
    {
        using var ctx = NewContext();
        var quiz = AddQuiz(ctx);
        var owner = AddUser(ctx, "owner");
        var other = AddUser(ctx, "other");

        var solo = AddSession(ctx, quiz, owner, 500, matchId: null, AnswerStatus.Correct);
        // The other user has their own solo session on the same quiz — still no relationship.
        AddSession(ctx, quiz, other, 400, matchId: null, AnswerStatus.Correct);

        Assert.False(await SutFor(ctx).IsMatchPeerAsync(solo.Id, other.Id));
    }
}
