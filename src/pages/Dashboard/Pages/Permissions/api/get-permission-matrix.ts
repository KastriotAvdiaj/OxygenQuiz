import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { PermissionMatrix } from "@/types/permission-types";

// One round-trip for the whole matrix: every permission + every role's current grants.
// SuperAdmin only on the backend ([Authorize(Roles = "SuperAdmin")]).
export const getPermissionMatrix = async (): Promise<PermissionMatrix> => {
  const result = await api.get(`/permissions/matrix`);
  return result.data as PermissionMatrix;
};

export const permissionMatrixQueryKey = ["permissionMatrix"] as const;

export const getPermissionMatrixQueryOptions = () =>
  queryOptions({
    queryKey: permissionMatrixQueryKey,
    queryFn: getPermissionMatrix,
  });

export const usePermissionMatrix = ({
  queryConfig,
}: {
  queryConfig?: QueryConfig<typeof getPermissionMatrixQueryOptions>;
} = {}) =>
  useQuery({
    ...getPermissionMatrixQueryOptions(),
    ...queryConfig,
  });
