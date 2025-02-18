import * as React from "react";

import { User, Question } from "@/types/ApiTypes";

import { useUser } from "@/lib/Auth";

export enum ROLES {
  Admin = "Admin",
  SuperAdmin = "SuperAdmin",
  User = "User",
}

type RoleTypes = keyof typeof ROLES;

export const POLICIES = {
  "comment:delete": (user: User, question: Question) => {
    if (user.role === "Admin") {
      return true;
    }

    if (user.role === "User" && question.user?.id === user.id) {
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
    ({ allowedRoles }: { allowedRoles: RoleTypes[] }) => {
      if (allowedRoles && allowedRoles.length > 0 && user.data) {
        console.log(allowedRoles?.includes(user.data.role));

        return allowedRoles?.includes(user.data.role);
      }

      return true;
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

  let canAccess = false;

  if (allowedRoles) {
    canAccess = checkAccess({ allowedRoles });
  }

  if (typeof policyCheck !== "undefined") {
    canAccess = policyCheck;
  }

  return <>{canAccess ? children : forbiddenFallback}</>;
};
