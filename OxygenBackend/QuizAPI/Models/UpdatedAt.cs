using QuizAPI.ManyToManyTables;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuizAPI.Models
{
    public class UpdatedAt
    {
        public int Id { get; set; }

        public string Username {  get; set; }

        public string? Description { get; set; }

        public Guid UserId { get; set; }
        public virtual User User{ get; set; }

        public DateTime ModifiedAt { get; set; } = DateTime.UtcNow;

        // Navigation property to the join table
        public ICollection<RoleUpdatedAt> RoleUpdatedAt { get; set; }
        public ICollection<PermissionUpdatedAt> PermissionUpdatedAt { get; set; }
        public ICollection<UserUpdatedAt> UserUpdatedAt { get; set; }


    }
}
