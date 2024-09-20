using QuizAPI.ManyToManyTables;
using QuizAPI.Models;

namespace QuizAPI.DTOs
{
    public class FullUserDTO
    {
        public Guid Id { get; set; }

        public string ImmutableName { get; set; }
        public string Username { get; set; }

        public string Email { get; set; }

        public string PasswordHash { get; set; } = string.Empty;

        public DateTime DateRegistered { get; set; }

        public string Role { get; set; }

        public Guid ConcurrencyStamp { get; set; }

        public bool IsDeleted { get; set; }

        public DateTime LastLogin { get; set; }

        public string ProfileImageUrl { get; set; }
    }
}
