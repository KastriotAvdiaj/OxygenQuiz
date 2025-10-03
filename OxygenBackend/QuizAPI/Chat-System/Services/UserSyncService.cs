namespace ChatApp.Services.Implementation
{
    using ChatApp.Models;
    using Microsoft.Extensions.Caching.Memory;
    using Microsoft.Extensions.Logging;
    using QuizAPI.Chat_System.Services;
    using QuizAPI.Services.Interfaces;

    public class UserSyncService : IUserSyncService
    {
        private readonly IUserService _userService;
        private readonly IMemoryCache _cache;
        private readonly ILogger<UserSyncService> _logger;
        private readonly TimeSpan _cacheExpiry = TimeSpan.FromMinutes(30);

        public UserSyncService(
            IUserService userService,
            IMemoryCache cache,
            ILogger<UserSyncService> logger)
        {
            _userService = userService;
            _cache = cache;
            _logger = logger;
        }

        public async Task<ChatUserInfo> GetOrCreateChatUserInfoAsync(Guid userId)
        {
            var cacheKey = $"chat_user_info_{userId}";

            if (_cache.TryGetValue(cacheKey, out ChatUserInfo? cachedInfo) && cachedInfo != null)
            {
                _logger.LogDebug("Retrieved user {UserId} from cache", userId);
                return cachedInfo;
            }

            try
            {
                var sqlUser = await _userService.GetUserByIdAsync(userId);
                if (sqlUser == null)
                {
                    _logger.LogWarning("User with ID {UserId} not found in SQL database", userId);
                    throw new KeyNotFoundException($"User with ID {userId} not found");
                }

                if (sqlUser.IsDeleted)
                {
                    _logger.LogWarning("Attempted to get ChatUserInfo for deleted user {UserId}", userId);
                    throw new InvalidOperationException($"User {userId} has been deleted");
                }

                var chatUserInfo = new ChatUserInfo
                {
                    UserId = sqlUser.Id,
                    Username = sqlUser.ImmutableName,
                    DisplayName = sqlUser.Username, // This is the displayable, changeable name
                    AvatarUrl = sqlUser.ProfileImageUrl,
                    LastUpdated = DateTime.UtcNow
                };

                _cache.Set(cacheKey, chatUserInfo, _cacheExpiry);
                _logger.LogInformation("Created and cached ChatUserInfo for user {UserId}", userId);

                return chatUserInfo;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting ChatUserInfo for user {UserId}", userId);
                throw;
            }
        }

        public async Task<ChatUserInfo> UpdateChatUserInfoAsync(Guid userId)
        {
            _logger.LogInformation("Updating ChatUserInfo for user {UserId}", userId);
            await InvalidateUserCacheAsync(userId);
            return await GetOrCreateChatUserInfoAsync(userId);
        }

        public async Task<IEnumerable<ChatUserInfo>> GetOrCreateChatUserInfosAsync(IEnumerable<Guid> userIds)
        {
            var result = new List<ChatUserInfo>();
            var uncachedUserIds = new List<Guid>();

            // Check cache first
            foreach (var userId in userIds.Distinct())
            {
                var cacheKey = $"chat_user_info_{userId}";
                if (_cache.TryGetValue(cacheKey, out ChatUserInfo? cachedInfo) && cachedInfo != null)
                {
                    result.Add(cachedInfo);
                }
                else
                {
                    uncachedUserIds.Add(userId);
                }
            }

            // Get uncached users from SQL
            if (uncachedUserIds.Any())
            {
                try
                {
                    var sqlUsers = await _userService.GetUsersByIdsAsync(uncachedUserIds);

                    foreach (var sqlUser in sqlUsers.Where(u => !u.IsDeleted))
                    {
                        var chatUserInfo = new ChatUserInfo
                        {
                            UserId = sqlUser.Id,
                            Username = sqlUser.ImmutableName,
                            DisplayName = sqlUser.Username,
                            AvatarUrl = sqlUser.ProfileImageUrl,
                            LastUpdated = DateTime.UtcNow
                        };

                        result.Add(chatUserInfo);

                        var cacheKey = $"chat_user_info_{sqlUser.Id}";
                        _cache.Set(cacheKey, chatUserInfo, _cacheExpiry);
                    }

                    _logger.LogInformation("Cached {Count} ChatUserInfos", sqlUsers.Count());
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error getting bulk ChatUserInfos");
                    throw;
                }
            }

            return result;
        }

        public async Task InvalidateUserCacheAsync(Guid userId)
        {
            var cacheKey = $"chat_user_info_{userId}";
            _cache.Remove(cacheKey);
            _logger.LogDebug("Invalidated cache for user {UserId}", userId);
            await Task.CompletedTask;
        }

        public async Task BulkUpdateUserCacheAsync(IEnumerable<Guid> userIds)
        {
            foreach (var userId in userIds.Distinct())
            {
                await InvalidateUserCacheAsync(userId);
            }
            _logger.LogInformation("Bulk invalidated cache for {Count} users", userIds.Count());
        }

        public async Task<bool> ValidateUserExistsAsync(Guid userId)
        {
            try
            {
                var user = await _userService.GetUserByIdAsync(userId);
                return user != null && !user.IsDeleted;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating user {UserId}", userId);
                return false;
            }
        }

        public async Task SyncUserInfoToMongoAsync(Guid userId)
        {
            _logger.LogInformation("Syncing user {UserId} info to MongoDB", userId);

            // This will be called when a user updates their profile in SQL
            // It invalidates the cache and forces MongoDB documents to refresh
            await UpdateChatUserInfoAsync(userId);

            // You would also need to update all MongoDB documents containing this user
            // This would be implemented in ChatRoomRepository and MessageRepository
        }
    }
}