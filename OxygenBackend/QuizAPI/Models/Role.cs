using QuizAPI.ManyToManyTables;

namespace QuizAPI.Models
{

    public class Role
    {
        public int Id { get; set; }

        public string Name { get; set; }

        public bool isActive { get; set; }
        public string Description { get; set; }

        public Guid CreatedById { get; set; }

        // Navigation property to the User who created the role
        public virtual User CreatedBy { get; set; }

        public Guid ConcurrencyStamp { get; set; }  

        // Navigation property to the join table
        public ICollection<RoleUpdatedAt> RoleUpdatedAt { get; set; }
    }
}
