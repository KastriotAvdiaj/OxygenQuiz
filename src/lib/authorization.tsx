import * as React from "react";

import { useUser } from "@/lib/Auth";
import { MultipleChoiceQuestion } from "@/types/question-types";
import { User } from "@/types/user-types";

export enum ROLES {
  Admin = "Admin",
  SuperAdmin = "SuperAdmin",
  User = "User",
}

type RoleTypes = ROLES;

// Helper: does the user hold any of the given roles?
const hasRole = (user: User, ...roles: string[]) =>
  user.roles?.some((r) => roles.includes(r)) ?? false;

export const POLICIES = {
  "comment:delete": (user: User, question: MultipleChoiceQuestion) => {
    if (hasRole(user, "Admin", "SuperAdmin")) {
      return true;
    }

    if (question.user.id === user.id) {
      return true;
    }

    return false;
  },
  "question:modify": (user: User, question: MultipleChoiceQuestion) => {
    // Admins and SuperAdmins can modify any question
    if (hasRole(user, "Admin", "SuperAdmin")) {
      return true;
    }

    // Users can only modify their own questions
    if (question.user.id === user.id) {
      return true;
    }

    return false;
  },
};

export const useAuthorization = () => {
  const user = useUser();

  if (!user.data) {
    throw Error("User does not exist!");
  }

  const checkAccess = React.useCallback(
    ({ allowedRoles }: { allowedRoles: ROLES[] }) => {
      if (!user.data) return false;
      if (allowedRoles.length === 0) return true;
      // Many-to-many: allow if the user holds ANY of the allowed roles.
      return allowedRoles.some((r) => user.data!.roles?.includes(r));
    },
    [user.data]
  );

  const checkPolicy = React.useCallback(
    (policyName: keyof typeof POLICIES, resource?: any) => {
      if (!user.data) return false;
      const policy = POLICIES[policyName];
      if (!policy) return false;
      return policy(user.data, resource);
    },
    [user.data]
  );

  return { checkAccess, checkPolicy, roles: user.data.roles };
};

type AuthorizationProps = {
  forbiddenFallback?: React.ReactNode;
  children: React.ReactNode;
} & (
  | {
      allowedRoles: RoleTypes[];
      policyCheck?: never;
      resource?: never;
    }
  | {
      allowedRoles?: never;
      policyCheck: keyof typeof POLICIES;
      resource?: any;
    }
);

export const Authorization = ({
  policyCheck,
  allowedRoles,
  resource,
  forbiddenFallback = null,
  children,
}: AuthorizationProps) => {
  const { checkAccess, checkPolicy } = useAuthorization();

  const canAccess = allowedRoles
    ? checkAccess({ allowedRoles })
    : policyCheck
    ? checkPolicy(policyCheck, resource)
    : false;

  return <>{canAccess ? children : forbiddenFallback}</>;
};
