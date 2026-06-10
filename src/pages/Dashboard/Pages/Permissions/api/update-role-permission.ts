import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { PermissionMatrix } from "@/types/permission-types";
import {
  getPermissionMatrixQueryOptions,
  permissionMatrixQueryKey,
} from "./get-permission-matrix";

export type UpdateRolePermissionInput = {
  roleId: number;
  permissionId: number;
  grant: boolean; // true = grant, false = revoke
};

// Grant -> POST, revoke -> DELETE. The backend is idempotent, so re-issuing a
// no-op (e.g. a double click) is harmless.
export const updateRolePermission = async ({
  roleId,
  permissionId,
  grant,
}: UpdateRolePermissionInput): Promise<void> => {
  const url = `/permissions/roles/${roleId}/permissions/${permissionId}`;
  if (grant) await api.post(url);
  else await api.delete(url);
};

type UseUpdateRolePermissionOptions = {
  mutationConfig?: MutationConfig<typeof updateRolePermission>;
};

export const useUpdateRolePermission = ({
  mutationConfig,
}: UseUpdateRolePermissionOptions = {}) => {
  const queryClient = useQueryClient();
  const { onMutate, onError, onSettled, ...restConfig } = mutationConfig || {};
  const queryKey = permissionMatrixQueryKey;

  return useMutation({
    mutationFn: updateRolePermission,

    // Optimistically flip the cell so the toggle feels instant; snapshot for rollback.
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<PermissionMatrix>(queryKey);

      queryClient.setQueryData<PermissionMatrix>(queryKey, (current) =>
        current
          ? {
              ...current,
              roles: current.roles.map((role) =>
                role.id !== variables.roleId
                  ? role
                  : {
                      ...role,
                      permissionIds: variables.grant
                        ? [...new Set([...role.permissionIds, variables.permissionId])]
                        : role.permissionIds.filter(
                            (id) => id !== variables.permissionId
                          ),
                    }
              ),
            }
          : current
      );

      onMutate?.(variables);
      return { previous };
    },

    // Roll back to the pre-mutation snapshot on failure.
    onError: (error, variables, onMutateResult, context) => {
      const previous = (onMutateResult as { previous?: PermissionMatrix })
        ?.previous;
      if (previous) queryClient.setQueryData(queryKey, previous);
      console.error("Error updating role permission:", error);
      onError?.(error, variables, onMutateResult, context);
    },

    // Re-sync with the server regardless of outcome.
    onSettled: (...args) => {
      queryClient.invalidateQueries({
        queryKey: getPermissionMatrixQueryOptions().queryKey,
      });
      onSettled?.(...args);
    },

    ...restConfig,
  });
};
