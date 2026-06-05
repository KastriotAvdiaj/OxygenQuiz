using Microsoft.Extensions.Caching.Memory;
using QuizAPI.Data;
using Microsoft.EntityFrameworkCore;
namespace QuizAPI.Services.Permissions
{
    public class PermissionService : IPermissionService
    {
        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;
        private static readonly TimeSpan CacheTTL = TimeSpan.FromMinutes(10);

        public PermissionService(ApplicationDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<bool> HasPermissionAsync(Guid userId, string permission)
        {
            var userPermissions = await GetPermissionsForUserAsync(userId);
            return userPermissions.Contains(permission);
        }

        private async Task<HashSet<string>> GetPermissionsForUserAsync(Guid userId)
        {
            var cacheKey = $"permissions:user:{userId}";

            if (_cache.TryGetValue(cacheKey, out HashSet<string>? cached) && cached != null)
                return cached;

            // Resolve all roles for this user, then all permissions for those roles
            var permissions = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .SelectMany(ur => ur.Role.RolePermissions)
                .Select(rp => rp.Permission.Name)
                .Distinct()
                .ToHashSetAsync();

            _cache.Set(cacheKey, permissions, CacheTTL);

            return permissions;
        }

        // Call this if you ever update a user's roles at runtime
        public void InvalidateCache(Guid userId)
        {
            _cache.Remove($"permissions:user:{userId}");
        }

        public async Task<bool> CanActOnResourceAsync(Guid userId, Guid ownerId, string resource, string action)
        {
            // If user owns the resource, check :own permission
            if (userId == ownerId)
                return await HasPermissionAsync(userId, $"{resource}:{action}:own");

            // Otherwise they need :any
            return await HasPermissionAsync(userId, $"{resource}:{action}:any");
        }

    }

    public static class QueryableExtensions
    {
        public static async Task<HashSet<TSource>> ToHashSetAsync<TSource>(
            this IQueryable<TSource> source,
            CancellationToken cancellationToken = default)
        {
            var list = await source.ToListAsync(cancellationToken);
            return [.. list];
        }
    }
    }
