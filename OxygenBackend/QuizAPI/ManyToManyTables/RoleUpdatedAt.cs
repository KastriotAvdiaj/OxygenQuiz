using QuizAPI.Models;

namespace QuizAPI.ManyToManyTables
{
    public class RoleUpdatedAt
    {
        public int RoleId { get; set; }
        public Role Role { get; set; }

        public int UpdatedAtId { get; set; }
        public UpdatedAt UpdatedAt { get; set; }
    }
}
