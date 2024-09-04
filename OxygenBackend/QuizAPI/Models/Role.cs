using QuizAPI.ManyToManyTables;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuizAPI.Models
{

    public class Role
    {
        public int Id { get; set; }

        public string Name { get; set; }

        public bool isActive { get; set; }
        public string Description { get; set; }

        public Guid ConcurrencyStamp { get; set; }  

        // Navigation property to the join table
        public ICollection<RoleUpdatedAt> RoleUpdatedAt { get; set; }
    }
}
