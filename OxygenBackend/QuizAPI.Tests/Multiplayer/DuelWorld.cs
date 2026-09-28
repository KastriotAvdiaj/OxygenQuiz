using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Moq;
using QuizAPI.Data;
using QuizAPI.Hubs;
using QuizAPI.Hubs.Clients;
using QuizAPI.Models;
using QuizAPI.Models.Associations;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Associations;
using QuizAPI.Services.QuizSessionServices;
using QuizAPI.Tests.Associations;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Multiplayer;

/// <summary>
/// A lobby with Ana (host) and Ben in it and an Associations quiz picked, over the real
/// <see cref="AssociationMatchOrchestrator"/>, the real Classic <see cref="MatchOrchestrator"/> (for
/// the shared lobby reset), the real session manager and repositories on an in-memory database.
/// SignalR is a mock that records every broadcast; the clock is a <see cref="FakeTimeProvider"/>.
///
/// <para>The Duel loop runs on a background task, as it does in production, so a test advances the
/// fake clock and then waits — briefly, in real time — for the loop to have acted on it
/// (<see cref="Eventually"/>).</para>
/// </summary>
internal sealed class DuelWorld
{
    public const string Room = "DUEL01";
    public const string Ana = "ana";
    public const string Ben = "ben";

    public readonly FakeTimeProvider Clock = new(new DateTimeOffset(2026, 9, 25, 18, 0, 0, TimeSpan.Zero));
    public readonly InMemoryQuizSessionManager Sessions = new();
    public readonly Mock<IQuizClient> Group = new();
    public readonly ServiceProvider Services;
    public readonly MatchOrchestrator Classic;
    public readonly AssociationMatchOrchestrator Duels;
    public readonly Dictionary<string, Guid> UserIds = new();
    public int QuizId { get; private set; }

    /// <summary>Tile ids by column (0–3 = A–D), in position order.</summary>
    public int[][] Tiles { get; private set; } = Array.Empty<int[]>();

    private readonly string _db = Guid.NewGuid().ToString();

    public DuelWorld()
    {
        var services = new ServiceCollection();
        services.AddScoped(_ => Context());
        services.AddScoped<IAssociationGameRepository, AssociationGameRepository>();
        services.AddScoped<IAssociationBoardRepository, AssociationBoardRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        var rules = new Mock<IAssociationRulesProvider>();
        rules.Setup(r => r.GetRulesFor(It.IsAny<int>())).Returns(AssociationRules.Default);
        services.AddSingleton(rules.Object);
        Services = services.BuildServiceProvider();

        var hub = new Mock<IHubContext<QuizHub, IQuizClient>>();
        hub.Setup(h => h.Clients.Group(It.IsAny<string>())).Returns(Group.Object);

        var scopes = Services.GetRequiredService<IServiceScopeFactory>();
        Classic = new MatchOrchestrator(hub.Object, Sessions, scopes, NullLogger<MatchOrchestrator>.Instance);
        Duels = new AssociationMatchOrchestrator(hub.Object, Sessions, scopes, Classic, Clock,
            NullLogger<AssociationMatchOrchestrator>.Instance)
        {
            // Deterministic: the first duel in a lobby is opened by Seat 0 (Ana).
            PickFirstSeat = _ => 0,
        };

        Seed();
    }

    public ApplicationDbContext Context() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(_db)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options,
            new TestCurrentUserService());

    private void Seed()
    {
        using var ctx = Context();
        foreach (var name in new[] { Ana, Ben, "cleo" })
        {
            var user = new User
            {
                Id = Guid.NewGuid(), Username = name, ImmutableName = name, Email = $"{name}@example.com",
                PasswordHash = "x", ProfileImageUrl = string.Empty, EmailConfirmed = true,
            };
            ctx.Users.Add(user);
            UserIds[name] = user.Id;
        }

        var quiz = new Quiz
        {
            Title = "Oxygen final",
            UserId = UserIds[Ana],
            Status = QuizStatus.Public,
            Format = QuizFormat.Associations,
            TimeLimitInSeconds = 240,
            Version = 3,
        };
        ctx.Quizzes.Add(quiz);
        ctx.SaveChanges();
        QuizId = quiz.Id;

        var clean = AssociationBoardValidator.ValidateAndClean(AssociationBoardServiceTests.Board(), 240, AssociationRules.Default);
        ctx.AssociationBoards.Add(AssociationBoardMapping.ToEntity(clean, quiz.Id, createdInVersion: 3));
        ctx.SaveChanges();

        Tiles = ctx.AssociationTiles.AsNoTracking().Include(t => t.Column).AsEnumerable()
            .GroupBy(t => t.Column.Position).OrderBy(g => g.Key)
            .Select(g => g.OrderBy(t => t.Position).Select(t => t.Id).ToArray())
            .ToArray();
    }

    /// <summary>Ana creates the lobby and picks the quiz; Ben joins. Both ready.</summary>
    public async Task<DuelWorld> WithLobby(params string[] extraPlayers)
    {
        await Sessions.CreateSessionAsync(Room, "Ana's lobby", 4, UserIds[Ana], Ana, "ana-1");
        await Sessions.AddParticipantAsync(Room, UserIds[Ben], Ben, "ben-1");
        foreach (var extra in extraPlayers)
            await Sessions.AddParticipantAsync(Room, UserIds[extra], extra, $"{extra}-1");
        await Sessions.SetQuizAsync(Room, new SelectedQuizView { Id = QuizId.ToString(), Title = "Oxygen final", Format = "Associations" });
        return this;
    }

    public int Tile(char column, int n) => Tiles[column - 'A'][n - 1];

    public MultiplayerSession Session => Sessions.GetSessionAsync(Room).Result!;

    /// <summary>Starts the Duel and runs the countdown out, until the board is on screen.</summary>
    public async Task StartAndCountDown()
    {
        var starting = Calls("DuelStarting").Count;
        var started = Calls("DuelStarted").Count;
        await Duels.StartMatchAsync(Room);
        await Eventually(() => Calls("DuelStarting").Count == starting + 1);
        Clock.Advance(TimeSpan.FromSeconds(3));
        await Eventually(() => Calls("DuelStarted").Count == started + 1);
    }

    /// <summary>Moves the fake clock and gives the loop's poll a moment to run on it.</summary>
    public async Task Advance(double seconds, Func<bool> until)
    {
        Clock.Advance(TimeSpan.FromSeconds(seconds));
        await Eventually(until);
    }

    public List<object?[]> Calls(string method) =>
        Group.Invocations.ToList().Where(i => i.Method.Name == method).Select(i => i.Arguments.ToArray()).ToList();

    public static async Task Eventually(Func<bool> condition, int timeoutMs = 5000)
    {
        var waited = 0;
        while (!condition())
        {
            if (waited >= timeoutMs) Assert.Fail("Timed out waiting for the Duel loop.");
            await Task.Delay(10);
            waited += 10;
        }
    }

    /// <summary>The loop has run its finally: the lobby is startable again.</summary>
    public bool LoopStopped => Session.MatchCts is null && Session.QuizState == QuizState.Lobby;
}
