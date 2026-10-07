namespace QuizAPI.Services.Roles
{
    /// <summary>
    /// The role-authorization rules that more than one feature has to agree on.
    ///
    /// These used to live as a private field in <c>UserService</c>, which was fine while changing a
    /// user's roles was the only way to grant one. Invite codes can now carry a role too
    /// (docs/auth/invite-code-system.md §7), so the same escalation rule is enforced in two places —
    /// and two copies of "which roles are privileged" is exactly the pair that drifts apart and
    /// leaves an escalation path open on whichever copy was forgotten.
    /// </summary>
    public static class RoleRules
    {
        /// <summary>The role every account gets. Signup fails loudly if it isn't seeded.</summary>
        public const string DefaultRole = "User";

        public const string Admin = "Admin";
        public const string SuperAdmin = "SuperAdmin";

        /// <summary>
        /// Hosts boards for a class and keeps Classes (docs/auth/teacher-role.md). A capability, not
        /// authority over other accounts — so it is <i>not</i> <see cref="IsElevated"/>.
        /// </summary>
        public const string Teacher = "Teacher";

        /// <summary>
        /// Who may host a board and keep Classes (docs/auth/teacher-role.md §1.1): a Teacher, and a
        /// SuperAdmin without needing the role. Not an Admin — Admin moderates, it doesn't host. A
        /// const so <c>[Authorize(Roles = RoleRules.HostRoles)]</c> can use it; comma-separated, as
        /// that attribute expects.
        /// </summary>
        public const string HostRoles = Teacher + "," + SuperAdmin;

        /// <summary>True when <paramref name="user"/> holds one of <see cref="HostRoles"/>.</summary>
        public static bool CanHost(System.Security.Claims.ClaimsPrincipal? user) =>
            user is not null && (user.IsInRole(Teacher) || user.IsInRole(SuperAdmin));

        /// <summary>The same rule over role names — for a <c>User</c> loaded from the database.</summary>
        public static bool CanHost(IEnumerable<string?> roleNames) =>
            roleNames.Any(r => Teacher.Equals(r, StringComparison.OrdinalIgnoreCase) ||
                               SuperAdmin.Equals(r, StringComparison.OrdinalIgnoreCase));

        /// <summary>Roles that may see a quiz format still in preview (<c>QuizFormatAccess</c>).</summary>
        public static readonly HashSet<string> PreviewFormatRoles =
            new(StringComparer.OrdinalIgnoreCase) { Admin, SuperAdmin, Teacher };

        /// <summary>
        /// Roles only a SuperAdmin may hand out — whether by changing a user's roles or by minting
        /// an invite code that grants one. Compared case-insensitively.
        /// </summary>
        public static readonly HashSet<string> SuperAdminOnlyRoles =
            new(StringComparer.OrdinalIgnoreCase) { "SuperAdmin" };

        /// <summary>
        /// True for a role with authority over other accounts — Admin and SuperAdmin. Elevated grants
        /// carry the extra rails (mandatory expiry, single code, bound to one email) that a plain
        /// invite doesn't need, and only a SuperAdmin may delete an account holding one.
        ///
        /// <para>Named explicitly rather than "anything but User": that was the definition until
        /// Teacher existed, and it would have made a Teacher undeletable by an Admin and a school's
        /// Teacher invite code impossible to mint in bulk — neither of which a Teacher warrants.</para>
        /// </summary>
        public static bool IsElevated(string? roleName) =>
            Admin.Equals(roleName, StringComparison.OrdinalIgnoreCase) ||
            SuperAdmin.Equals(roleName, StringComparison.OrdinalIgnoreCase);

        /// <summary>True for any real role other than <see cref="DefaultRole"/> — something a grant adds.</summary>
        public static bool IsExtraRole(string? roleName) =>
            !string.IsNullOrWhiteSpace(roleName) &&
            !DefaultRole.Equals(roleName.Trim(), StringComparison.OrdinalIgnoreCase);
    }
}
