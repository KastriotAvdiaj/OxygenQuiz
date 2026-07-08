import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";

import { getUsersQueryOptions } from "./get-users";

export type UpdateUserRolesInput = {
  userId: string;
  // Desired end-state role set (not a delta). The backend replaces the user's
  // roles with exactly these and enforces who may grant SuperAdmin.
  roles: string[];
};

export const updateUserRoles = ({ userId, roles }: UpdateUserRolesInput) =>
  api.put(`/Users/${userId}/roles`, { roles });

type UseUpdateUserRolesOptions = {
  mutationConfig?: MutationConfig<typeof updateUserRoles>;
};

export const useUpdateUserRoles = ({
  mutationConfig,
}: UseUpdateUserRolesOptions = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: updateUserRoles,
    onSuccess: (...args) => {
      // Refresh the users table so the new roles show immediately.
      queryClient.invalidateQueries({
        queryKey: getUsersQueryOptions().queryKey,
      });
      onSuccess?.(...args);
    },
    onError: (error, variables, onMutateResult, context) => {
      console.error("Error updating user roles:", error);
      onError?.(error, variables, onMutateResult, context);
    },
    ...restConfig,
  });
};
