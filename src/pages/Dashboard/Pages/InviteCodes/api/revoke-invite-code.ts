import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { inviteCodesQueryKey } from "./get-invite-codes";

// Revokes an unused code so it can no longer be redeemed. The backend rejects
// revoking an already-consumed code and is idempotent for an already-revoked one.
export const revokeInviteCode = async (id: number): Promise<void> => {
  await api.post(`/admin/invite-codes/${id}/revoke`);
};

type UseRevokeInviteCodeOptions = {
  mutationConfig?: MutationConfig<typeof revokeInviteCode>;
};

export const useRevokeInviteCode = ({
  mutationConfig,
}: UseRevokeInviteCodeOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: revokeInviteCode,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: inviteCodesQueryKey });
      onSuccess?.(...args);
    },
    ...restConfig,
  });
};
