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

        /// <summary>
        /// Roles only a SuperAdmin may hand out — whether by changing a user's roles or by minting
        /// an invite code that grants one. Compared case-insensitively.
        /// </summary>
        public static readonly HashSet<string> SuperAdminOnlyRoles =
            new(StringComparer.OrdinalIgnoreCase) { "SuperAdmin" };

        /// <summary>
        /// True for any role above <see cref="DefaultRole"/>. Elevated grants carry the extra rails
        /// (mandatory expiry, single code, bound to one email) that a plain tester invite doesn't need.
        /// </summary>
        public static bool IsElevated(string? roleName) =>
            !string.IsNullOrWhiteSpace(roleName) &&
            !DefaultRole.Equals(roleName, StringComparison.OrdinalIgnoreCase);
    }
}
