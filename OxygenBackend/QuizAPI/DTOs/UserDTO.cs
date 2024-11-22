namespace QuizAPI.DTOs
{
    // Used for logging the User in
    public class UserDTO
    {
        public Guid Id { get; set; }
        public string Email { get; set; }
        public string Username { get; set; }

        public string Role { get; set; }
    }
}
