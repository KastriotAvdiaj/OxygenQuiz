using QuizAPI.Models;

namespace QuizAPI.ManyToManyTables
{
    public class PermissionUpdatedAt
    {
        public int PermissionId { get; set; }
        public Permission Permission { get; set; }

        public int UpdatedAtId { get; set; }
        public UpdatedAt UpdatedAt { get; set; }
    }
}
