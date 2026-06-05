using QuizAPI.DTOs.User;
using QuizAPI.Models;

namespace QuizAPI.Mapping
{
    public static class UserMappings
    {
        public static UserDTO ToDto(this User user) =>
            user.ToDto(user.UserRoles.Select(ur => ur.Role.Name));

        // Overload for when roles are already resolved (e.g. right after create),
        // so we don't re-walk UserRoles.
        public static UserDTO ToDto(this User user, IEnumerable<string> roleNames) => new()
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            DateRegistered = user.DateRegistered,
            LastLogin = user.LastLogin,
            IsDeleted = user.IsDeleted,
            ProfileImageUrl = user.ProfileImageUrl,
            Roles = roleNames.ToList()
        };

        public static IReadOnlyList<UserDTO> ToDtoList(this IEnumerable<User> users) =>
            users.Select(u => u.ToDto()).ToList();
    }
}