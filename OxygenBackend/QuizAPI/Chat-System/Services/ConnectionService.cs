using System.Collections.Concurrent;
using QuizAPI.Chat_System.Services; 

public class ConnectionService : IConnectionService
{
    // A thread-safe dictionary to map UserId -> Set of ConnectionIds
    // We use a HashSet because a user can have multiple connections (phone, browser)
    private static readonly ConcurrentDictionary<Guid, HashSet<string>> _userConnections = new();

    public Task AddConnectionAsync(Guid userId, string connectionId, string? userAgent = null, string? ipAddress = null)
    {
        // Get the set of connections for the user, or create a new set if it's their first connection
        var connections = _userConnections.GetOrAdd(userId, _ => new HashSet<string>());

        lock (connections)
        {
            connections.Add(connectionId);
        }

        // In a real app, you might log the userAgent and ipAddress here
        return Task.CompletedTask;
    }

    public Task RemoveConnectionAsync(string connectionId)
    {
        // This is tricky because we have to find which user this connection belongs to
        foreach (var entry in _userConnections)
        {
            lock (entry.Value)
            {
                if (entry.Value.Contains(connectionId))
                {
                    entry.Value.Remove(connectionId);

                    // If the user has no more connections, remove them from the dictionary
                    if (entry.Value.Count == 0)
                    {
                        _userConnections.TryRemove(entry.Key, out _);
                    }
                    break; 
                }
            }
        }
        return Task.CompletedTask;
    }

    public Task<IEnumerable<string>> GetUserConnectionsAsync(Guid userId)
    {
        _userConnections.TryGetValue(userId, out var connections);
        return Task.FromResult(connections?.AsEnumerable() ?? Enumerable.Empty<string>());
    }

    public Task<bool> IsUserOnlineAsync(Guid userId)
    {
        return Task.FromResult(_userConnections.ContainsKey(userId));
    }

    // --- Methods to implement later ---
    public Task<IEnumerable<Guid>> GetOnlineUsersInRoomAsync(string roomId)
    {
        // This requires also mapping connections to rooms, often done in SignalR Groups
        // or in a separate dictionary here: ConcurrentDictionary<string, HashSet<Guid>> _roomUsers
        throw new NotImplementedException("Room tracking needs to be added.");
    }

    public Task CleanupInactiveConnectionsAsync()
    {
        // Would be called by a background service to remove zombie connections
        throw new NotImplementedException();
    }

    public Task UpdateLastPingAsync(string connectionId)
    {
        // Part of the zombie connection cleanup logic
        throw new NotImplementedException();
    }
}