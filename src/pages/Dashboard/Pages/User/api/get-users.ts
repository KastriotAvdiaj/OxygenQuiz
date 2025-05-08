import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { User } from "@/types/ApiTypes";

export const getUsers = (): Promise<User[]> => {
  return api.get(`/users`).then(response => response.data);
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

export const useUserData = ({ queryConfig }: UseUserOptions) => {
  return useQuery({
    ...getUsersQueryOptions(),
    ...queryConfig,
  });
};
