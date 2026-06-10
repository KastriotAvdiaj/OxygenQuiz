// Mirrors the backend Permission DTOs (camelCase over the wire). Drives the admin
// Permissions page (role ↔ permission matrix).

export type Permission = {
  id: number;
  name: string; // e.g. "question:update:any"
  description: string;
  resource: string; // first segment of the name, e.g. "question"
  isActive: boolean;
};

export type RolePermissions = {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  // SuperAdmin: implicitly holds everything and is locked in the matrix.
  isSystem: boolean;
  permissionIds: number[];
};

export type PermissionMatrix = {
  permissions: Permission[];
  roles: RolePermissions[];
};
