import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";

export const getTotalUsers = (): Promise<number> => {
  return api.get(`/totals/users`);
};

export const getTotalUsersQueryOptions = () => {
  return queryOptions({
    queryKey: ["totalUsers"],
    queryFn: () => getTotalUsers(),
  });
};

type UseUserOptions = {
  queryConfig?: QueryConfig<typeof getTotalUsersQueryOptions>;
};


export const useTotalUsersData = ({ queryConfig }: UseUserOptions) => {
  return useQuery({
    ...getTotalUsersQueryOptions(),
    ...queryConfig,
  });
};
