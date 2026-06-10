namespace QuizAPI.Services.Permissions
{
    public interface IPermissionService
    {
        Task<bool> HasPermissionAsync(Guid userId, string permission);
        Task<bool> CanActOnResourceAsync(Guid userId, Guid ownerId, string resource, string action);

        /// <summary>Drop the cached permission set for a single user.</summary>
        void InvalidateCache(Guid userId);

        /// <summary>Drop the cached permission set for every user that holds the given
        /// role. Call this after changing a role's permissions so the next request
        /// re-resolves against the new grants instead of serving stale, cached ones.</summary>
        Task InvalidateRoleAsync(int roleId);
    }
}
