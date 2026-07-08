import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiService } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { Role } from "@/types/user-types";

export const getRoles = (): Promise<Role[]> => {
  return apiService.get(`/Roles`);
};

export const getRolesQueryOptions = () => {
  return queryOptions({
    queryKey: ["roles"],
    queryFn: () => getRoles(),
    // Roles change rarely; cache them so the role picker opens instantly.
    staleTime: 5 * 60_000,
  });
};

type UseRolesOptions = {
  queryConfig?: QueryConfig<typeof getRolesQueryOptions>;
};

export const useRoles = ({ queryConfig }: UseRolesOptions = {}) => {
  return useQuery({
    ...getRolesQueryOptions(),
    ...queryConfig,
  });
};
