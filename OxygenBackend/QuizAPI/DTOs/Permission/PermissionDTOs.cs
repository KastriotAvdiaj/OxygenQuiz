namespace QuizAPI.DTOs.Permission
{
    /// <summary>A single permission definition. <see cref="Resource"/> is the first
    /// segment of the name (e.g. "question" in "question:update:any") and is supplied
    /// so the client can group rows without re-parsing the name.</summary>
    public class PermissionDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Resource { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    /// <summary>A role together with the ids of the permissions it currently holds.</summary>
    public class RolePermissionsDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsActive { get; set; }

        /// <summary>True for the SuperAdmin role, which implicitly holds every
        /// permission and is therefore not editable from the matrix.</summary>
        public bool IsSystem { get; set; }

        public List<int> PermissionIds { get; set; } = new();
    }

    /// <summary>Everything the Permissions page needs in one round-trip: the full list
    /// of permissions (columns/rows source) and every role with its current grants.</summary>
    public class PermissionMatrixDTO
    {
        public List<PermissionDTO> Permissions { get; set; } = new();
        public List<RolePermissionsDTO> Roles { get; set; } = new();
    }
}
