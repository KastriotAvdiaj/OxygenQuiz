using QuizAPI.ManyToManyTables;
using QuizAPI.Models;

namespace QuizAPI.DTOs.User
{
    // Used for getting the users
    public class FullUserDTO
    {
        public Guid Id { get; set; }

        public string ImmutableName { get; set; }
        public string Username { get; set; }

        public string Email { get; set; }

        public string PasswordHash { get; set; } = string.Empty;

        public DateTime DateRegistered { get; set; }

        public string Role { get; set; }

        public bool IsDeleted { get; set; }

        public DateTime LastLogin { get; set; }

        public int TotalUsers { get; set; }

        public string ProfileImageUrl { get; set; }
    }
}
