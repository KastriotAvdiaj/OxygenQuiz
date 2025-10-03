namespace QuizAPI.Chat_System.Services
{
    public interface IConnectionService
    {
        Task AddConnectionAsync(Guid userId, string connectionId,
            string? userAgent = null, string? ipAddress = null);
        Task RemoveConnectionAsync(string connectionId);
        Task<IEnumerable<string>> GetUserConnectionsAsync(Guid userId);
        Task<bool> IsUserOnlineAsync(Guid userId);
        Task<IEnumerable<Guid>> GetOnlineUsersInRoomAsync(string roomId);
        Task CleanupInactiveConnectionsAsync(); // Background service
        Task UpdateLastPingAsync(string connectionId);
    }
}
