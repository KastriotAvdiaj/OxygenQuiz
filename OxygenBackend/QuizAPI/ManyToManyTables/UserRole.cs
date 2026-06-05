using Microsoft.EntityFrameworkCore;
using QuizAPI.Models;
using System.ComponentModel.DataAnnotations;

namespace QuizAPI.ManyToManyTables
{
    [Index(nameof(UserId), nameof(RoleId), IsUnique = true)]
    public class UserRole
    {
        [Key]
        public int Id { get; set; }

        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        public int RoleId { get; set; }
        public Role Role { get; set; } = null!;

        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        public Guid? AssignedByUserId { get; set; } // optional: audit trail
    }
}
