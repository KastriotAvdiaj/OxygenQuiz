namespace QuizAPI.DTOs.User
{
    // Minimal, safe-to-expose view of a user for the public profile page.
    // Deliberately excludes email, permissions, isDeleted, and last login.
    public class PublicUserProfileDTO
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? ProfileImageUrl { get; set; }
        public DateTime DateRegistered { get; set; }
        public IReadOnlyList<string> Roles { get; set; } = Array.Empty<string>();
    }
}
