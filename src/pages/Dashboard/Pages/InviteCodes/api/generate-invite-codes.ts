import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { inviteCodesQueryKey } from "./get-invite-codes";

export type GenerateInviteCodesInput = {
  count: number;
  label?: string;
  // ISO string (UTC). Omit for codes that never expire.
  expiresAt?: string;
};

// The ONLY time plaintext codes leave the server — save them now, they can't be re-read.
export type GeneratedInviteCodes = {
  codes: string[];
};

export const generateInviteCodes = async (
  input: GenerateInviteCodesInput
): Promise<GeneratedInviteCodes> => {
  const result = await api.post(`/admin/invite-codes`, input);
  return result.data as GeneratedInviteCodes;
};

type UseGenerateInviteCodesOptions = {
  mutationConfig?: MutationConfig<typeof generateInviteCodes>;
};

export const useGenerateInviteCodes = ({
  mutationConfig,
}: UseGenerateInviteCodesOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: generateInviteCodes,
    onSuccess: (...args) => {
      // Refresh the status list so the new (unused) codes appear immediately.
      queryClient.invalidateQueries({ queryKey: inviteCodesQueryKey });
      onSuccess?.(...args);
    },
    ...restConfig,
  });
};
