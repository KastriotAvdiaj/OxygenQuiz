namespace QuizAPI.DTOs.User
{
    // Used for logging the User in
    public class UserDTO
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public DateTime DateRegistered { get; set; }
        public DateTime LastLogin { get; set; }
        public bool IsDeleted { get; set; }
        public string? ProfileImageUrl { get; set; }
        public IReadOnlyList<string> Roles { get; set; } = Array.Empty<string>();
    }

}
