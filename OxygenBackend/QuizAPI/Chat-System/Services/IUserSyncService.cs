using ChatApp.Models;

namespace QuizAPI.Chat_System.Services
{
    public interface IUserSyncService
    {
        /// <summary>
        /// Gets user information from the cache or creates it by fetching from the primary database if not found.
        /// </summary>
        /// <param name="userId">The unique identifier of the user.</param>
        /// <returns>The user's chat information.</returns>
        Task<ChatUserInfo> GetOrCreateChatUserInfoAsync(Guid userId);

        /// <summary>
        /// Invalidates the cache for a user and fetches their latest information.
        /// </summary>
        /// <param name="userId">The unique identifier of the user to update.</param>
        /// <returns>The updated user's chat information.</returns>
        Task<ChatUserInfo> UpdateChatUserInfoAsync(Guid userId);

        /// <summary>
        /// Gets a collection of user information, utilizing the cache for efficiency.
        /// </summary>
        /// <param name="userIds">A collection of user unique identifiers.</param>
        /// <returns>A collection of the users' chat information.</returns>
        Task<IEnumerable<ChatUserInfo>> GetOrCreateChatUserInfosAsync(IEnumerable<Guid> userIds);

        /// <summary>
        /// Removes a specific user's information from the cache.
        /// </summary>
        /// <param name="userId">The unique identifier of the user to invalidate.</param>
        Task InvalidateUserCacheAsync(Guid userId);

        /// <summary>
        /// Removes a collection of users' information from the cache.
        /// </summary>
        /// <param name="userIds">A collection of user unique identifiers to invalidate.</param>
        Task BulkUpdateUserCacheAsync(IEnumerable<Guid> userIds);

        /// <summary>
        /// Checks if a user exists and is not marked as deleted in the primary database.
        /// </summary>
        /// <param name="userId">The unique identifier of the user to validate.</param>
        /// <returns>True if the user exists and is not deleted; otherwise, false.</returns>
        Task<bool> ValidateUserExistsAsync(Guid userId);

        /// <summary>
        /// Triggers a synchronization process for a user's information.
        /// </summary>
        /// <param name="userId">The unique identifier of the user to sync.</param>
        Task SyncUserInfoToMongoAsync(Guid userId);
    }
}