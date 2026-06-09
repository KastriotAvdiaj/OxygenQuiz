import * as React from "react";

import { useUser } from "@/lib/Auth";
import { User } from "@/types/user-types";

export enum ROLES {
  Admin = "Admin",
  SuperAdmin = "SuperAdmin",
  User = "User",
}

// ── primitives ─────────────────────────────────────────────
const hasRole = (user: User, ...roles: string[]) =>
  user.roles?.some((r) => roles.includes(r)) ?? false;


const isSuperAdmin = (user: User) => hasRole(user, ROLES.SuperAdmin);

const hasPermission = (user: User, permission: string) =>
  isSuperAdmin(user) || (user.permissions?.includes(permission) ?? false);

// Any resource that exposes its owner as { user: { id } }.
type OwnedResource = { user: { id: string } };

// Collapses the :any / :own pattern. `any` wins outright; otherwise
// you need the `own` permission AND to be the resource's owner.
const canActOnResource = (
  user: User,
  resource: OwnedResource | undefined,
  anyPerm: string,
  ownPerm: string
) => {
  if (hasPermission(user, anyPerm)) return true;
  if (!resource) return false;
  return hasPermission(user, ownPerm) && resource.user.id === user.id;
};

// ── policies: ONLY for ownership-scoped decisions ──────────
export const POLICIES = {
  "question:update": (u: User, r: OwnedResource) =>
    canActOnResource(u, r, "question:update:any", "question:update:own"),
  "question:delete": (u: User, r: OwnedResource) =>
    canActOnResource(u, r, "question:delete:any", "question:delete:own"),
  "quiz:update": (u: User, r: OwnedResource) =>
    canActOnResource(u, r, "quiz:update:any", "quiz:update:own"),
  "quiz:delete": (u: User, r: OwnedResource) =>
    canActOnResource(u, r, "quiz:delete:any", "quiz:delete:own"),
} satisfies Record<string, (user: User, resource: OwnedResource) => boolean>;

// ── hook ───────────────────────────────────────────────────
export const useAuthorization = () => {
  const user = useUser();

  if (!user.data) {
    throw Error("User does not exist!");
  }

  // Role gate — coarse "is this an admin area" checks.
  const checkAccess = React.useCallback(
    ({ allowedRoles }: { allowedRoles: ROLES[] }) => {
      if (!user.data) return false;
      if (allowedRoles.length === 0) return true;
      return hasRole(user.data, ...allowedRoles);
    },
    [user.data]
  );

  // Flat permission gate (no resource) — buttons, nav, create actions.
  const checkPermission = React.useCallback(
    (...permissions: string[]) => {
      if (!user.data) return false;
      if (permissions.length === 0) return true;
      return permissions.some((p) => hasPermission(user.data!, p));
    },
    [user.data]
  );

  // Policy gate (needs the resource) — :own / :any decisions.
  const checkPolicy = React.useCallback(
    (policyName: keyof typeof POLICIES, resource: OwnedResource) => {
      if (!user.data) return false;
      const policy = POLICIES[policyName];
      return policy ? policy(user.data, resource) : false;
    },
    [user.data]
  );

  return {
    checkAccess,
    checkPermission,
    checkPolicy,
    roles: user.data.roles,
    permissions: user.data.permissions,
  };
};

// ── declarative wrapper ────────────────────────────────────
type AuthorizationProps = {
  forbiddenFallback?: React.ReactNode;
  children: React.ReactNode;
} & (
  | {
      allowedRoles: ROLES[];
      allowedPermissions?: never;
      policyCheck?: never;
      resource?: never;
    }
  | {
      allowedRoles?: never;
      allowedPermissions: string[];
      policyCheck?: never;
      resource?: never;
    }
  | {
      allowedRoles?: never;
      allowedPermissions?: never;
      policyCheck: keyof typeof POLICIES;
      resource: OwnedResource;
    }
);

export const Authorization = ({
  policyCheck,
  allowedRoles,
  allowedPermissions,
  resource,
  forbiddenFallback = null,
  children,
}: AuthorizationProps) => {
  const { checkAccess, checkPermission, checkPolicy } = useAuthorization();

  let canAccess = false;
  if (allowedRoles) canAccess = checkAccess({ allowedRoles });
  else if (allowedPermissions) canAccess = checkPermission(...allowedPermissions);
  else if (policyCheck) canAccess = checkPolicy(policyCheck, resource);

  return <>{canAccess ? children : forbiddenFallback}</>;
};