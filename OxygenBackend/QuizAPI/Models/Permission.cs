using QuizAPI.ManyToManyTables;

namespace QuizAPI.Models
{
    public class Permission
    {
        public int Id { get; set; }

        public string Name { get; set; }

        public bool isActive { get; set; }

        public string Description{ get; set; }

        public ICollection<PermissionUpdatedAt> PermissionUpdatedAt { get; set; }

    }
}
