using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using QuizAPI.DTOs.Classroom;
using QuizAPI.Services.Classroom;
using QuizAPI.Services.Roles;

namespace QuizAPI.Hubs
{
    public interface IHostedGameClient
    {
        /// <summary>The game changed — the Display view (never the Controller's, ADR 0024).</summary>
        Task HostedGameUpdated(HostedGameViewDTO view);
        /// <summary>The host disconnected every screen: stop showing the game.</summary>
        Task ScreenRevoked();
        /// <summary>How many Displays are connected, for the Controller's "screens" count and Answer key.</summary>
        Task DisplaysChanged(int count);
    }

    /// <summary>
    /// Live updates for hosted games (docs/quiz/classroom.md, "Displays"). Separate from the lobby's
    /// <c>QuizHub</c>: nothing here is a lobby, and a Display is anonymous.
    ///
    /// <para><b>Displays join with a Screen code alone</b> (ADR 0024) and only ever receive the
    /// Display view. A connection gets <see cref="MaxCodeAttempts"/> wrong codes before it is
    /// refused outright, and the code space is ~8.5×10¹¹, so guessing is not a strategy.</para>
    ///
    /// <para><b>The Controller joins by game id</b>, signed in, as the game's host. When the last
    /// Controller connection drops and stays gone for <see cref="ControllerGrace"/>, the game is
    /// paused (C13) — the lobby's grace, for the same reason: a reload is not leaving.</para>
    ///
    /// <para>Work after the grace outlives this invocation, so it takes an
    /// <see cref="IServiceScopeFactory"/>, never the hub's own provider (CLAUDE.md).</para>
    /// </summary>
    public class HostedGameHub : Hub<IHostedGameClient>
    {
        public const int MaxCodeAttempts = 5;
        public static readonly TimeSpan ControllerGrace = TimeSpan.FromSeconds(5);
        private static readonly ConcurrentDictionary<string, int> FailedAttempts = new();

        private readonly IHostedGameService _games;
        private readonly IHostedDisplayRegistry _screens;
        private readonly IServiceScopeFactory _scopes;
        private readonly ILogger<HostedGameHub> _logger;

        public HostedGameHub(IHostedGameService games, IHostedDisplayRegistry screens, IServiceScopeFactory scopes, ILogger<HostedGameHub> logger)
        {
            _games = games;
            _screens = screens;
            _scopes = scopes;
            _logger = logger;
        }

        public static string Group(Guid gameId) => $"hosted-{gameId}";

        /// <summary>A Display joining. Returns its view, or throws a sentence for the screen.</summary>
        public async Task<HostedGameViewDTO> JoinAsDisplay(string code)
        {
            if (FailedAttempts.TryGetValue(Context.ConnectionId, out var failed) && failed >= MaxCodeAttempts)
                throw new HubException("Too many wrong codes. Reload the page to try again.");

            var found = await _games.GetForScreenCodeAsync(code);
            if (found is not { } hit)
            {
                FailedAttempts.AddOrUpdate(Context.ConnectionId, 1, (_, n) => n + 1);
                throw new HubException("No game with that code is running.");
            }
            if (!_screens.TryAddDisplay(hit.GameId, Context.ConnectionId))
                throw new HubException($"This game already has {IHostedDisplayRegistry.MaxDisplays} screens.");

            FailedAttempts.TryRemove(Context.ConnectionId, out _);
            await Groups.AddToGroupAsync(Context.ConnectionId, Group(hit.GameId));
            await Clients.Group(Group(hit.GameId)).DisplaysChanged(_screens.DisplayCount(hit.GameId));
            return hit.View;
        }

        /// <summary>The host's Controller joining its game's group.</summary>
        public async Task JoinAsController(Guid gameId)
        {
            var user = Context.User;
            var raw = user?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!RoleRules.CanHost(user) || !Guid.TryParse(raw, out var userId) || !await _games.IsHostAsync(gameId, userId))
                throw new HubException("Game not found.");

            _screens.AddController(gameId, Context.ConnectionId);
            await Groups.AddToGroupAsync(Context.ConnectionId, Group(gameId));
            await Clients.Caller.DisplaysChanged(_screens.DisplayCount(gameId));
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            FailedAttempts.TryRemove(Context.ConnectionId, out _);
            var left = _screens.Remove(Context.ConnectionId);
            if (left is { } gone)
            {
                if (!gone.WasController)
                {
                    await Clients.Group(Group(gone.GameId)).DisplaysChanged(_screens.DisplayCount(gone.GameId));
                }
                else if (_screens.ControllerCount(gone.GameId) == 0)
                {
                    var gameId = gone.GameId;
                    var screens = _screens;
                    var scopes = _scopes;
                    var logger = _logger;
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await Task.Delay(ControllerGrace);
                            if (screens.ControllerCount(gameId) > 0) return;   // they came back
                            using var scope = scopes.CreateScope();
                            await scope.ServiceProvider.GetRequiredService<IHostedGameService>().PauseIfRunningAsync(gameId);
                        }
                        catch (Exception ex)
                        {
                            logger.LogError(ex, "Pausing hosted game {GameId} after its controller left failed.", gameId);
                        }
                    });
                }
            }
            await base.OnDisconnectedAsync(exception);
        }
    }

    /// <summary>Sends hosted-game changes to the game's hub group.</summary>
    public sealed class HostedGameNotifier : IHostedGameNotifier
    {
        private readonly IHubContext<HostedGameHub, IHostedGameClient> _hub;

        public HostedGameNotifier(IHubContext<HostedGameHub, IHostedGameClient> hub) => _hub = hub;

        public Task GameChangedAsync(Guid gameId, HostedGameViewDTO displayView) =>
            _hub.Clients.Group(HostedGameHub.Group(gameId)).HostedGameUpdated(displayView);

        public async Task DisplaysRevokedAsync(IReadOnlyList<string> connectionIds)
        {
            if (connectionIds.Count == 0) return;
            await _hub.Clients.Clients(connectionIds).ScreenRevoked();
        }
    }
}
