using System.Collections.Concurrent;

namespace QuizAPI.Services.Classroom
{
    /// <summary>
    /// Who is connected to each hosted game's hub group: its Displays and its Controller(s)
    /// (docs/quiz/classroom.md, "Displays"). In memory, per server — like the lobby's own state
    /// (docs/quiz/multiplayer.md): a restart drops every connection, and the clients reconnect.
    /// Thread-safe: hub connections come and go on any thread.
    /// </summary>
    public interface IHostedDisplayRegistry
    {
        /// <summary>At most this many Displays per game (C7).</summary>
        const int MaxDisplays = 3;

        bool TryAddDisplay(Guid gameId, string connectionId);
        void AddController(Guid gameId, string connectionId);
        /// <summary>Forgets a connection. Returns its game and whether it was a Controller, or null if unknown.</summary>
        (Guid GameId, bool WasController)? Remove(string connectionId);
        int DisplayCount(Guid gameId);
        int ControllerCount(Guid gameId);
        /// <summary>Forgets every Display of a game and returns their connection ids, to be told to go.</summary>
        IReadOnlyList<string> RemoveDisplays(Guid gameId);
    }

    public sealed class HostedDisplayRegistry : IHostedDisplayRegistry
    {
        private readonly object _lock = new();
        private readonly Dictionary<Guid, HashSet<string>> _displays = new();
        private readonly Dictionary<Guid, HashSet<string>> _controllers = new();
        private readonly Dictionary<string, (Guid GameId, bool IsController)> _byConnection = new();

        public bool TryAddDisplay(Guid gameId, string connectionId)
        {
            lock (_lock)
            {
                var set = Get(_displays, gameId);
                if (set.Contains(connectionId)) return true;
                if (set.Count >= IHostedDisplayRegistry.MaxDisplays) return false;
                set.Add(connectionId);
                _byConnection[connectionId] = (gameId, false);
                return true;
            }
        }

        public void AddController(Guid gameId, string connectionId)
        {
            lock (_lock)
            {
                Get(_controllers, gameId).Add(connectionId);
                _byConnection[connectionId] = (gameId, true);
            }
        }

        public (Guid GameId, bool WasController)? Remove(string connectionId)
        {
            lock (_lock)
            {
                if (!_byConnection.Remove(connectionId, out var entry)) return null;
                var map = entry.IsController ? _controllers : _displays;
                if (map.TryGetValue(entry.GameId, out var set))
                {
                    set.Remove(connectionId);
                    if (set.Count == 0) map.Remove(entry.GameId);
                }
                return (entry.GameId, entry.IsController);
            }
        }

        public int DisplayCount(Guid gameId) { lock (_lock) return _displays.TryGetValue(gameId, out var s) ? s.Count : 0; }

        public int ControllerCount(Guid gameId) { lock (_lock) return _controllers.TryGetValue(gameId, out var s) ? s.Count : 0; }

        public IReadOnlyList<string> RemoveDisplays(Guid gameId)
        {
            lock (_lock)
            {
                if (!_displays.Remove(gameId, out var set)) return Array.Empty<string>();
                foreach (var id in set) _byConnection.Remove(id);
                return set.ToList();
            }
        }

        private static HashSet<string> Get(Dictionary<Guid, HashSet<string>> map, Guid gameId)
        {
            if (!map.TryGetValue(gameId, out var set)) map[gameId] = set = new HashSet<string>();
            return set;
        }
    }

    /// <summary>
    /// Tells a hosted game's screens that it changed. Implemented over SignalR by the hub; a no-op
    /// double in tests. Sends only Display views — never the Controller's (ADR 0024).
    /// </summary>
    public interface IHostedGameNotifier
    {
        Task GameChangedAsync(Guid gameId, DTOs.Classroom.HostedGameViewDTO displayView);
        /// <summary>The Displays of this game were disconnected by the host: tell them to go.</summary>
        Task DisplaysRevokedAsync(IReadOnlyList<string> connectionIds);
    }
}
