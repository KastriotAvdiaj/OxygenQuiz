namespace QuizAPI.DTOs.User
{
    /// <summary>
    /// A role as the admin UI reads it (the role picker, invite codes): no concurrency stamp and no
    /// navigation collections. <c>GET /api/Roles</c> is readable by Admins, not only SuperAdmins,
    /// so it returns this rather than the <c>Role</c> entity (docs/auth/user-role-management.md).
    /// </summary>
    public class RoleDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public string? Description { get; set; }
    }
}
