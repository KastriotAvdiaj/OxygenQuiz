namespace QuizAPI.DTOs.User
{
    /// <summary>
    /// Server-internal projection of a SQL User, consumed by UserSyncService
    /// to build cached ChatUserInfo objects. Never returned to a client.
    /// </summary>
    public class ChatUserProjection
    {
        public Guid Id { get; init; }
        public required string Username { get; init; }
        public string? ProfileImageUrl { get; init; }
    }
}