namespace QuizAPI.Models
{
    public class User
    {
        public Guid Id { get; set; }

        public string Username { get; set; }

        public string Email { get; set; }

        public string PasswordHash { get; set; } = string.Empty;

        public DateTime DateRegistered { get; set; }

        public DateTime DateModified { get; set; }

        // Navigation property to the collection of UpdatedAtTable
        public ICollection<UpdatedAt> UpdatedAt { get; set; }



    }
}
