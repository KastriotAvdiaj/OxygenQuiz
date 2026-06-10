using Microsoft.Extensions.Caching.Memory;
using QuizAPI.Data;
using Microsoft.EntityFrameworkCore;
namespace QuizAPI.Services.Permissions
{
    public class PermissionService : IPermissionService
    {
        private const string SuperAdminRole = "SuperAdmin";

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
            // SuperAdmin can do everything, regardless of which permission rows are seeded.
            // This is the single backend source of truth for that rule (the frontend mirrors it).
            if (await IsSuperAdminAsync(userId)) return true;

            var userPermissions = await GetPermissionsForUserAsync(userId);
            return userPermissions.Contains(permission);
        }

        // Whether the user holds the SuperAdmin role. Cached like permissions to avoid a DB hit
        // on every authorization check.
        private async Task<bool> IsSuperAdminAsync(Guid userId)
        {
            var cacheKey = SuperAdminCacheKey(userId);
            if (_cache.TryGetValue(cacheKey, out bool cached)) return cached;

            var isSuperAdmin = await _context.UserRoles
                .AnyAsync(ur => ur.UserId == userId && ur.Role.Name == SuperAdminRole);

            _cache.Set(cacheKey, isSuperAdmin, CacheTTL);
            return isSuperAdmin;
        }

        private async Task<HashSet<string>> GetPermissionsForUserAsync(Guid userId)
        {
            var cacheKey = PermissionsCacheKey(userId);

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

        private static string PermissionsCacheKey(Guid userId) => $"permissions:user:{userId}";
        private static string SuperAdminCacheKey(Guid userId) => $"isSuperAdmin:user:{userId}";

        // Call this if you ever update a user's roles at runtime
        public void InvalidateCache(Guid userId)
        {
            _cache.Remove(PermissionsCacheKey(userId));
            _cache.Remove(SuperAdminCacheKey(userId));
        }

        // A role's permissions changed — every user holding that role now has a stale
        // cache entry. Resolve the affected users and evict each one.
        public async Task InvalidateRoleAsync(int roleId)
        {
            var affectedUserIds = await _context.UserRoles
                .Where(ur => ur.RoleId == roleId)
                .Select(ur => ur.UserId)
                .Distinct()
                .ToListAsync();

            foreach (var userId in affectedUserIds)
                InvalidateCache(userId);
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
