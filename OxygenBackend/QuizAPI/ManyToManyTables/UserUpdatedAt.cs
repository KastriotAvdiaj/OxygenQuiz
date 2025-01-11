using QuizAPI.Models;
using QuizAPI.Models.User;

namespace QuizAPI.ManyToManyTables
{
    public class UserUpdatedAt
    {

        public Guid UserId { get; set; }
        public User User { get; set; }

        public int UpdatedAtId { get; set; }
        public UpdatedAt UpdatedAt { get; set; }
    }
}
