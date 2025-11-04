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

export const POLICIES = {
  "comment:delete": (user: User, question: MultipleChoiceQuestion) => {
    if (user.role === "Admin") {
      return true;
    }

    if (user.role === "User" && question.user.id === user.id) {
      return true;
    }

    return false;
  },
  "question:modify": (user: User, question: MultipleChoiceQuestion) => {
    // Admins and SuperAdmins can modify any question
    if (user.role === "Admin" || user.role === "SuperAdmin") {
      return true;
    }

    // Users can only modify their own questions
    if (user.role === "User" && question.user.id === user.id) {
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
      return allowedRoles.includes(user.data.role as ROLES);
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

  return { checkAccess, checkPolicy, role: user.data.role };
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
