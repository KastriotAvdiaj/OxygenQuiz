using QuizAPI.ManyToManyTables;

namespace QuizAPI.Models
{
    public class User
    {
        public Guid Id { get; set; }

        public string ImmutableName { get; set; }
        public string Username { get; set; }

        public string Email { get; set; }

        public string PasswordHash { get; set; } = string.Empty;

        public DateTime DateRegistered { get; set; }

        // Navigation property to the collection of UpdatedAtTable
        public ICollection<UserUpdatedAt> UserUpdatedAt { get; set; }

        public Guid ConcurrencyStamp { get; set; }

        public bool IsDeleted { get; set; }

        public DateTime LastLogin { get; set; }


        public string ProfileImageUrl { get; set; }

        public User() {
            ConcurrencyStamp = Guid.NewGuid();
            }

    }
}
