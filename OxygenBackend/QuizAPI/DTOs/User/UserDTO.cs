namespace QuizAPI.DTOs.User
{
    // Used for logging the User in
    public class UserDTO
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool EmailConfirmed { get; set; }
        public DateTime DateRegistered { get; set; }
        public DateTime LastLogin { get; set; }
        public bool IsDeleted { get; set; }
        public string? ProfileImageUrl { get; set; }
        public IReadOnlyList<string> Roles { get; set; } = Array.Empty<string>();
        // Flat permission strings the user holds, derived from their roles.
        public IReadOnlyList<string> Permissions { get; set; } = Array.Empty<string>();
    }

}
