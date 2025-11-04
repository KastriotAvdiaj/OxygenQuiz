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

  return { checkAccess, role: user.data.role };
};

type AuthorizationProps = {
  forbiddenFallback?: React.ReactNode;
  children: React.ReactNode;
} & (
  | {
      allowedRoles: RoleTypes[];
      policyCheck?: never;
    }
  | {
      allowedRoles?: never;
      policyCheck: boolean;
    }
);

export const Authorization = ({
  policyCheck,
  allowedRoles,
  forbiddenFallback = null,
  children,
}: AuthorizationProps) => {
  const { checkAccess } = useAuthorization();

  const canAccess = allowedRoles
    ? checkAccess({ allowedRoles })
    : policyCheck ?? false;

  console.log("Authorization check:", {
    allowedRoles,
    canAccess,
  });

  return <>{canAccess ? children : forbiddenFallback}</>;
};
