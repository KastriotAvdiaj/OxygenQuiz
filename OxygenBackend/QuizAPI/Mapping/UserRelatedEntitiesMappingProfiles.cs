using QuizAPI.DTOs.User;
using QuizAPI.Models;

namespace QuizAPI.Mapping
{
    public static class UserMappings
    {
        // Walks the loaded graph for both roles and their permissions.
        // Requires UserRoles → Role → RolePermissions → Permission to be included
        // (see UserRepository.WithRolesAndPermissions). When permissions aren't
        // included (e.g. the user-list query), Permissions comes back empty.
        public static UserDTO ToDto(this User user)
        {
            var permissions = user.UserRoles
                .Where(ur => ur.Role.RolePermissions != null)
                .SelectMany(ur => ur.Role.RolePermissions)
                .Select(rp => rp.Permission.Name)
                .Distinct()
                .ToList();

            return new UserDTO
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                DateRegistered = user.DateRegistered,
                LastLogin = user.LastLogin,
                IsDeleted = user.IsDeleted,
                ProfileImageUrl = user.ProfileImageUrl,
                Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList(),
                Permissions = permissions
            };
        }

        // Overload for when roles are already resolved (e.g. right after create),
        // so we don't re-walk UserRoles. The permission graph isn't loaded here,
        // so Permissions is left empty by design.
        public static UserDTO ToDto(this User user, IEnumerable<string> roleNames) => new()
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            DateRegistered = user.DateRegistered,
            LastLogin = user.LastLogin,
            IsDeleted = user.IsDeleted,
            ProfileImageUrl = user.ProfileImageUrl,
            Roles = roleNames.ToList(),
            Permissions = Array.Empty<string>()
        };

        public static IReadOnlyList<UserDTO> ToDtoList(this IEnumerable<User> users) =>
            users.Select(u => u.ToDto()).ToList();
    }
}