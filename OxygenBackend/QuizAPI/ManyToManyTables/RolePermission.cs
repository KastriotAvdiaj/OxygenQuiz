using Microsoft.EntityFrameworkCore;
using QuizAPI.Models;
using System.ComponentModel.DataAnnotations;

namespace QuizAPI.ManyToManyTables
{
    [Index(nameof(RoleId), nameof(PermissionId), IsUnique = true)]
    public class RolePermission
    {
        public int RoleId { get; set; }
        public Role Role { get; set; } = null!;

        public int PermissionId { get; set; }
        public Permission Permission { get; set; } = null!;
    }
}
