using QuizAPI.ManyToManyTables;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Models
{
    public class User
    {
        public Guid Id { get; set; }

        public string ImmutableName { get; set; }
        public string Username { get; set; }

        public string Email { get; set; }

        // True once the user has proven they control their email via the confirmation link.
        // New signups start false; pre-existing accounts are backfilled to true by the
        // AddEmailVerification migration so they aren't retroactively nagged.
        public bool EmailConfirmed { get; set; }

        public string PasswordHash { get; set; } = string.Empty;

        public DateTime DateRegistered { get; set; }

        public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();

        // Navigation property to the collection of QuizSession
        public ICollection<QuizSession> QuizSessions { get; set; }

        public Guid ConcurrencyStamp { get; set; }

        public bool IsDeleted { get; set; }

        public DateTime LastLogin { get; set; }


        public string? ProfileImageUrl { get; set; }

        // 1:1 per-user preferences (music, sound, theme, etc.)
        public UserSettings? Settings { get; set; }

        public User()
        {
            ConcurrencyStamp = Guid.NewGuid();
        }

    }
}
