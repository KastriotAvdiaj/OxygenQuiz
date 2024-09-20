import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { User } from "@/types/ApiTypes";

export const getUsers = (): Promise<{
  data: User[];
}> => {
  return api.get(`/users`);
};

export const getUsersQueryOptions = () => {
  return queryOptions({
    queryKey: ["users"],
    queryFn: () => getUsers(),
  });
};

type UseUserOptions = {
  queryConfig?: QueryConfig<typeof getUsersQueryOptions>;
};

export const userUser = ({ queryConfig }: UseUserOptions) => {
  return useQuery({
    ...getUsersQueryOptions(),
    ...queryConfig,
  });
};
