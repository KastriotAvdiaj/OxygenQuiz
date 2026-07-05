import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";

// Mirrors the backend InviteCodeStatusDTO (Controllers/Admin/InviteCodesController.List).
// Never includes plaintext — the raw code is only returned once, at generation.
export type InviteCodeStatus = {
  id: number;
  label: string | null;
  createdAt: string;
  expiresAt: string | null;
  consumedAt: string | null;
  consumedByUserId: string | null;
  consumedByUsername: string | null;
  revokedAt: string | null;
  isRedeemable: boolean;
};

export const getInviteCodes = async (): Promise<InviteCodeStatus[]> => {
  const result = await api.get(`/admin/invite-codes`);
  return result.data as InviteCodeStatus[];
};

export const inviteCodesQueryKey = ["invite-codes"] as const;

export const getInviteCodesQueryOptions = () =>
  queryOptions({
    queryKey: inviteCodesQueryKey,
    queryFn: getInviteCodes,
  });

export const useInviteCodes = ({
  queryConfig,
}: {
  queryConfig?: QueryConfig<typeof getInviteCodesQueryOptions>;
} = {}) =>
  useQuery({
    ...getInviteCodesQueryOptions(),
    ...queryConfig,
  });
