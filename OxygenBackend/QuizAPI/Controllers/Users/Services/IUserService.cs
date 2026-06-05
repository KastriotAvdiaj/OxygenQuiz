using QuizAPI.DTOs.User;

namespace QuizAPI.Services.Interfaces
{
    public interface IUserService
    {
        Task<IReadOnlyList<UserDTO>> GetAllUsersAsync(CancellationToken ct = default);
        Task<UserDTO?> GetUserByIdAsync(Guid userId, CancellationToken ct = default);
        Task<UserDTO?> GetUserByUsernameAsync(string username, CancellationToken ct = default);
        Task<IReadOnlyList<UserDTO>> GetUsersByIdsAsync(IEnumerable<Guid> userIds, CancellationToken ct = default);
        Task<UserDTO> CreateUserAsync(CreateUserDTO dto, CancellationToken ct = default);
        Task UpdateUserAsync(Guid userId, UpdateUserDTO dto, CancellationToken ct = default);
        Task DeleteUserAsync(Guid userId, CancellationToken ct = default);
        Task<bool> UserExistsAsync(Guid userId, CancellationToken ct = default);

/*
        /// <summary>
        /// Returns a lightweight chat-subsystem projection for a single user.
        /// Returns null if the user does not exist or has been soft-deleted.
        /// </summary>
        Task<ChatUserDTO?> GetUserForChatAsync(Guid userId);

        /// <summary>
        /// Returns chat-subsystem projections for a batch of user IDs.
        /// IDs that don't resolve (missing or soft-deleted) are silently omitted,
        /// consistent with the soft-delete query filter behaviour.
        /// </summary>
        Task<IReadOnlyList<ChatUserDTO>> GetUsersForChatAsync(IEnumerable<Guid> userIds);*/
    }
}