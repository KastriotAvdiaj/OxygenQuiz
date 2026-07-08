using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.User
{
    /// <summary>
    /// Admin request to replace a user's role set. The list is the desired end-state (not a delta):
    /// whatever roles it names become the user's roles, and any current role it omits is removed.
    /// Role names are matched case-insensitively against the seeded roles.
    /// </summary>
    public class SetUserRolesDTO
    {
        [Required, MinLength(1, ErrorMessage = "At least one role is required.")]
        public IReadOnlyList<string> Roles { get; set; } = new List<string>();
    }
}
