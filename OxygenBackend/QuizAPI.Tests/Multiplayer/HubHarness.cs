using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using QuizAPI.Data;
using QuizAPI.Hubs;
using QuizAPI.Hubs.Clients;
using QuizAPI.Services.QuizSessionServices;
using QuizAPI.Tests.TestSupport;

namespace QuizAPI.Tests.Multiplayer;

/// <summary>
/// A <see cref="QuizHub"/> over a real <see cref="InMemoryQuizSessionManager"/>, with SignalR's
/// clients, groups and caller context mocked. <see cref="As"/> gives a hub instance for one
/// connection — SignalR creates a hub per invocation, and so does this.
/// </summary>
internal sealed class HubHarness
{
    public readonly InMemoryQuizSessionManager Sessions = new();
    public readonly Mock<IQuizClient> Group = new();
    public readonly Mock<IQuizClient> Caller = new();
    public readonly Mock<IGroupManager> Groups = new();
    public readonly Mock<IMatchOrchestrator> Classic = new();
    public readonly Mock<IAssociationMatchOrchestrator> Duels = new();
    public readonly ServiceProvider Services;
    /// <summary>Drives the 5-second disconnect grace.</summary>
    public readonly Microsoft.Extensions.Time.Testing.FakeTimeProvider Clock = new();

    /// <summary>
    /// One account per username. The hub keys players by account id and reads the display name
    /// from the database (docs/auth/account-identity-changes.md §4), so the same name must stay the
    /// same account across calls, and that account must exist.
    /// </summary>
    private readonly Dictionary<string, Guid> _accounts = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Connection items per connection id — SignalR keeps these per connection, across invocations.</summary>
    private readonly Dictionary<string, ConnectionItems> _items = new();

    public HubHarness(Action<IServiceCollection>? configure = null)
    {
        var dbName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddScoped(_ => new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(dbName).Options,
            new TestCurrentUserService()));
        // What the disconnect grace's background task resolves once the hub instance is gone.
        services.AddSingleton<QuizAPI.Services.Interfaces.IQuizSessionManager>(Sessions);
        var hubContext = new Mock<IHubContext<QuizHub, IQuizClient>>();
        hubContext.Setup(c => c.Clients.Group(It.IsAny<string>())).Returns(Group.Object);
        services.AddSingleton(hubContext.Object);
        services.AddSingleton(Duels.Object);
        configure?.Invoke(services);
        Services = services.BuildServiceProvider();
    }

    public QuizHub As(string username, string connectionId, Guid? userId = null, params string[] roles)
    {
        var hub = new QuizHub(Sessions, Services.GetRequiredService<IServiceScopeFactory>(), Classic.Object, Duels.Object, Clock,
            Microsoft.Extensions.Logging.Abstractions.NullLogger<QuizHub>.Instance);

        var clients = new Mock<IHubCallerClients<IQuizClient>>();
        clients.Setup(c => c.Group(It.IsAny<string>())).Returns(Group.Object);
        clients.Setup(c => c.Caller).Returns(Caller.Object);
        hub.Clients = clients.Object;
        hub.Groups = Groups.Object;

        var identity = new ClaimsIdentity(new[]
        {
            new Claim("username", username),
            new Claim(ClaimTypes.NameIdentifier, Account(username, userId).ToString()),
        }.Concat(roles.Select(r => new Claim(ClaimTypes.Role, r))), "test");

        if (!_items.TryGetValue(connectionId, out var items))
            _items[connectionId] = items = new ConnectionItems();

        var context = new Mock<HubCallerContext>();
        context.Setup(c => c.User).Returns(new ClaimsPrincipal(identity));
        context.Setup(c => c.ConnectionId).Returns(connectionId);
        context.Setup(c => c.Items).Returns(items);
        hub.Context = context.Object;

        return hub;
    }

    /// <summary>The account behind <paramref name="username"/>, created on first use.</summary>
    public Guid Account(string username, Guid? userId = null)
    {
        if (_accounts.TryGetValue(username, out var known))
            return known;

        var id = userId ?? Guid.NewGuid();
        _accounts[username] = id;
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Users.Add(new QuizAPI.Models.User
        {
            Id = id, Username = username, ImmutableName = username.ToLowerInvariant(),
            Email = $"{username}@example.com", PasswordHash = "x", ProfileImageUrl = string.Empty,
            EmailConfirmed = true,
        });
        db.SaveChanges();
        return id;
    }
}

/// <summary>
/// SignalR's connection items answer null for a missing key rather than throwing (its own
/// <c>ConnectionItems</c> type does this), and QuizHub reads them with <c>Items["Username"] as string</c>.
/// </summary>
internal sealed class ConnectionItems : IDictionary<object, object?>
{
    private readonly Dictionary<object, object?> _inner = new();
    private ICollection<KeyValuePair<object, object?>> Pairs => _inner;

    public object? this[object key]
    {
        get => _inner.TryGetValue(key, out var v) ? v : null;
        set => _inner[key] = value;
    }

    public ICollection<object> Keys => _inner.Keys;
    public ICollection<object?> Values => _inner.Values;
    public int Count => _inner.Count;
    public bool IsReadOnly => false;
    public void Add(object key, object? value) => _inner.Add(key, value);
    public void Add(KeyValuePair<object, object?> item) => Pairs.Add(item);
    public void Clear() => _inner.Clear();
    public bool Contains(KeyValuePair<object, object?> item) => Pairs.Contains(item);
    public bool ContainsKey(object key) => _inner.ContainsKey(key);
    public void CopyTo(KeyValuePair<object, object?>[] array, int arrayIndex) => Pairs.CopyTo(array, arrayIndex);
    public bool Remove(object key) => _inner.Remove(key);
    public bool Remove(KeyValuePair<object, object?> item) => Pairs.Remove(item);
    public bool TryGetValue(object key, out object? value) => _inner.TryGetValue(key, out value);
    public IEnumerator<KeyValuePair<object, object?>> GetEnumerator() => _inner.GetEnumerator();
    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() => GetEnumerator();
}
