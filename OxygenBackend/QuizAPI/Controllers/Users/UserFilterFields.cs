using QuizAPI.Filtering;
using QuizAPI.Models;
using static QuizAPI.Filtering.FilterOperator;

namespace QuizAPI.Controllers.Users
{
    /// <summary>
    /// Whitelist of fields clients may filter / search / sort users by. Only scalar columns
    /// are exposed; role filtering is a collection concern and is intentionally not part of
    /// the generic engine — "role" rules (role:eq:Admin / role:in:Admin,User) are handled
    /// separately in UserService.SearchUsersAsync. See docs/quiz/filtering.md.
    /// </summary>
    public static class UserFilterFields
    {
        public static readonly FilterFieldSet<User> Fields = new FilterFieldSet<User>()
            .Field("username",       u => u.Username,       new[] { Contains, StartsWith, Eq }, searchable: true, sortable: true)
            .Field("email",          u => u.Email,          new[] { Contains, Eq },             searchable: true)
            .Field("isDeleted",      u => u.IsDeleted,      new[] { Eq })
            .Field("lastLogin",      u => u.LastLogin,      new[] { Eq, Gt, Gte, Lt, Lte, Between }, sortable: true)
            .Field("dateRegistered", u => u.DateRegistered, new[] { Eq, Gt, Gte, Lt, Lte, Between }, sortable: true, defaultSort: true);
    }
}
