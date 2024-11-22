namespace QuizAPI.DTOs
{

    // Used for creating a new User
    public class TemporaryUserCR
    {
        public string Username { get; set; }

        public string Email { get; set; }

        public string? Role { get; set; }

        public string Password { get; set; }

    }
}
