using QuizAPI.ManyToManyTables;
using QuizAPI.Models;

namespace QuizAPI.Tests.Billing;

internal static class BillingTestUsers
{
    /// <summary>An in-memory user holding <paramref name="roles"/> — enough for the entitlement and grant rules, which only read roles.</summary>
    public static User With(Guid id, params string[] roles)
    {
        var user = new User { Id = id, Username = "u" + id.ToString("N")[..6], ImmutableName = "u", Email = "u@example.com" };
        var roleId = 1;
        foreach (var name in roles.DefaultIfEmpty("User"))
            user.UserRoles.Add(new UserRole { UserId = id, User = user, RoleId = roleId, Role = new Role { Id = roleId++, Name = name } });
        return user;
    }
}
