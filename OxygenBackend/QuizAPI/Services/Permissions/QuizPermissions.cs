namespace QuizAPI.Services.Permissions
{
    /// <summary>
    /// Permission names for acting on someone else's quiz. Checked through
    /// <see cref="IPermissionService.HasPermissionAsync"/>, which lets a SuperAdmin through every
    /// check whatever the permission rows say, so these are always true for the SuperAdmin.
    /// Who else holds them is decided by the role's permission rows (PermissionSeeder, and the
    /// Permissions page). See docs/auth/user-role-management.md §1.1.
    ///
    /// There is deliberately no "play any quiz" permission: admins can view and edit any quiz, but
    /// playing one that isn't Public or theirs would write sessions into its owner's analytics.
    /// </summary>
    public static class QuizPermissions
    {
        /// <summary>Edit, publish / unpublish and save the board of any quiz. Seeded to Admin.</summary>
        public const string UpdateAny = "quiz:update:any";
    }
}
