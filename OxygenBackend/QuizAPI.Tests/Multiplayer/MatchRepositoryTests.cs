using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Multiplayer;

/// <summary>
/// The reads behind the lobby's review and the history page's Multiplayer tab: matches are
/// grouped by the lobby they were played in, and a player only ever gets matches they were in.
/// See docs/quiz/multiplayer.md §7.6.
/// </summary>
public class MatchRepositoryTests
{
    private static readonly DateTime T0 = new(2026, 10, 1, 18, 0, 0, DateTimeKind.Utc);

    private readonly ApplicationDbContext _ctx;
    private readonly Guid _ana = Guid.NewGuid();
    private readonly Guid _ben = Guid.NewGuid();
    private readonly Guid _cleo = Guid.NewGuid();

    public MatchRepositoryTests()
    {
        _ctx = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options,
            new TestCurrentUserService());
        _ctx.Quizzes.AddRange(
            new Quiz { Id = 1, Title = "Capitals", Format = QuizFormat.Classic },
            new Quiz { Id = 2, Title = "Rivers", Format = QuizFormat.Classic },
            new Quiz { Id = 3, Title = "A board", Format = QuizFormat.Associations });
        foreach (var (id, name) in new[] { (_ana, "Ana"), (_ben, "Ben"), (_cleo, "Cleo") })
            _ctx.Users.Add(new User
            {
                Id = id, Username = name, ImmutableName = name, Email = $"{name}@example.com",
                PasswordHash = "x", ProfileImageUrl = string.Empty, EmailConfirmed = true,
            });
        _ctx.SaveChanges();
    }

    private MatchRepository Repo => new(_ctx);

    /// <summary>A recorded match: the first player is the winner unless <paramref name="tie"/>.</summary>
    private Guid Match(Guid? lobbyId, int minutes, int quizId, bool tie, params Guid[] players)
    {
        var match = new Match
        {
            Id = Guid.NewGuid(), QuizId = quizId, RoomCode = "ROOM1", LobbyId = lobbyId,
            HostUserId = players[0], StartedAt = T0.AddMinutes(minutes), EndedAt = T0.AddMinutes(minutes + 5),
            WinnerUserId = tie ? null : players[0],
        };
        _ctx.Matches.Add(match);
        for (var i = 0; i < players.Length; i++)
            _ctx.QuizSessions.Add(new QuizSession
            {
                Id = Guid.NewGuid(), QuizId = quizId, UserId = players[i], MatchId = match.Id,
                Mode = QuizSessionMode.Multiplayer, IsCompleted = true,
                StartTime = match.StartedAt, EndTime = match.EndedAt,
                TotalScore = tie ? 100 : 300 - i * 100,
            });
        _ctx.SaveChanges();
        _ctx.ChangeTracker.Clear();
        return match.Id;
    }

    [Fact]
    public async Task ALobbysMatches_ComeBackOldestFirst_WithEveryPlayersSessionAndScore()
    {
        var lobby = Guid.NewGuid();
        var second = Match(lobby, minutes: 10, quizId: 2, tie: false, _ben, _ana);
        var first = Match(lobby, minutes: 0, quizId: 1, tie: false, _ana, _ben);

        var matches = await Repo.ListForLobbyAsync(lobby, _ana);

        Assert.Equal(new[] { first, second }, matches.Select(m => m.MatchId));
        Assert.Equal(new[] { "Capitals", "Rivers" }, matches.Select(m => m.QuizTitle));
        Assert.All(matches, m => Assert.Equal(lobby, m.LobbyKey));

        var rematch = matches[1];
        Assert.Equal(new[] { ("Ben", 300, true), ("Ana", 200, false) },
            rematch.Players.Select(p => (p.Username, p.TotalScore, p.IsWinner)));
        Assert.All(rematch.Players, p => Assert.NotEqual(Guid.Empty, p.SessionId));
    }

    /// <summary>Joined for the third match: the first two are not theirs to read.</summary>
    [Fact]
    public async Task APlayer_OnlyGetsTheMatchesTheyPlayedIn()
    {
        var lobby = Guid.NewGuid();
        Match(lobby, 0, 1, false, _ana, _ben);
        Match(lobby, 10, 1, false, _ana, _ben);
        var third = Match(lobby, 20, 1, false, _ana, _ben, _cleo);

        var cleos = await Repo.ListForLobbyAsync(lobby, _cleo);

        Assert.Equal(new[] { third }, cleos.Select(m => m.MatchId));
    }

    [Fact]
    public async Task AnotherLobbysMatches_AreNotThisLobbys_EvenWithTheSameRoomCode()
    {
        var lobby = Guid.NewGuid();
        var mine = Match(lobby, 0, 1, false, _ana, _ben);
        Match(Guid.NewGuid(), 10, 1, false, _ana, _ben);   // RoomCode is "ROOM1" for both

        var matches = await Repo.ListForLobbyAsync(lobby, _ana);

        Assert.Equal(new[] { mine }, matches.Select(m => m.MatchId));
    }

    [Fact]
    public async Task ATie_HasNoWinner()
    {
        var lobby = Guid.NewGuid();
        Match(lobby, 0, 1, tie: true, _ana, _ben);

        var match = Assert.Single(await Repo.ListForLobbyAsync(lobby, _ana));

        Assert.All(match.Players, p => Assert.False(p.IsWinner));
    }

    [Fact]
    public async Task History_IsOneEntryPerLobby_MostRecentlyPlayedFirst()
    {
        var friday = Guid.NewGuid();
        var saturday = Guid.NewGuid();
        Match(friday, 0, 1, false, _ana, _ben);
        Match(friday, 10, 2, false, _ben, _ana);
        Match(friday, 20, 1, false, _ana, _ben);
        Match(saturday, 24 * 60, 3, false, _ana, _cleo);

        var page = await Repo.ListLobbiesForUserAsync(_ana, page: 1, pageSize: 20);

        Assert.Equal(2, page.TotalItems);
        Assert.Equal(new[] { saturday, friday }, page.Items.Select(l => l.LobbyKey));
        Assert.Equal(new[] { 1, 3 }, page.Items.Select(l => l.Matches.Count));
        Assert.Equal("Associations", page.Items[0].Matches[0].Format);   // a Duel is a match too
        Assert.Equal(T0, page.Items[1].StartedAt);
        Assert.Equal(T0.AddMinutes(20), page.Items[1].LastPlayedAt);
    }

    /// <summary>
    /// Recorded before lobbies had an id. There is no saying afterwards which of them shared a
    /// lobby, so each is its own — not all of them one giant lobby with a null key.
    /// </summary>
    [Fact]
    public async Task MatchesFromBeforeLobbyIds_AreEachTheirOwnLobby()
    {
        var a = Match(lobbyId: null, 0, 1, false, _ana, _ben);
        var b = Match(lobbyId: null, 10, 1, false, _ana, _ben);

        var page = await Repo.ListLobbiesForUserAsync(_ana, 1, 20);

        Assert.Equal(new[] { b, a }, page.Items.Select(l => l.LobbyKey));
        Assert.All(page.Items, l => Assert.Single(l.Matches));
    }

    [Fact]
    public async Task History_PagesByLobby_NotByMatch()
    {
        var older = Guid.NewGuid();
        var newer = Guid.NewGuid();
        Match(older, 0, 1, false, _ana, _ben);
        Match(older, 10, 1, false, _ana, _ben);
        Match(newer, 60, 1, false, _ana, _ben);

        var first = await Repo.ListLobbiesForUserAsync(_ana, page: 1, pageSize: 1);
        var second = await Repo.ListLobbiesForUserAsync(_ana, page: 2, pageSize: 1);

        Assert.Equal(2, first.TotalItems);
        Assert.Equal(newer, Assert.Single(first.Items).LobbyKey);
        Assert.Equal(2, Assert.Single(second.Items).Matches.Count);
    }

    [Fact]
    public async Task History_LeavesOutLobbiesThePlayerWasNeverIn()
    {
        Match(Guid.NewGuid(), 0, 1, false, _ana, _ben);

        var page = await Repo.ListLobbiesForUserAsync(_cleo, 1, 20);

        Assert.Empty(page.Items);
        Assert.Equal(0, page.TotalItems);
    }

    /// <summary>
    /// History already hides the plays of a deleted quiz. The lobby list counts groups without
    /// reading the quiz, so without the explicit check it would count this lobby and then hand it
    /// back with no matches in it.
    /// </summary>
    [Fact]
    public async Task ALobbyWhoseOnlyQuizWasDeleted_IsNotListed()
    {
        Match(Guid.NewGuid(), 0, 2, false, _ana, _ben);
        var kept = Guid.NewGuid();
        Match(kept, 10, 1, false, _ana, _ben);
        var quiz = await _ctx.Quizzes.SingleAsync(q => q.Id == 2);
        quiz.DeletedAt = T0.AddDays(1);
        await _ctx.SaveChangesAsync();
        _ctx.ChangeTracker.Clear();

        var page = await Repo.ListLobbiesForUserAsync(_ana, 1, 20);

        Assert.Equal(1, page.TotalItems);
        Assert.Equal(kept, Assert.Single(page.Items).LobbyKey);
    }
}
