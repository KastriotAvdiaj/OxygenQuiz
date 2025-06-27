import { queryOptions, useQuery } from "@tanstack/react-query";

import {  apiService } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { User } from "@/types/user-types";

export const getUsers = (): Promise<User[]> => {
  return apiService.get(`/users`);
};

export const getUsersQueryOptions = () => {
  return queryOptions({
    queryKey: ["users"],
    queryFn: () => getUsers(),
  });
};

type UseUserOptions = {
  queryConfig?: QueryConfig<typeof getUsersQueryOptions>;
  initialData?: User[];
};

export const useUserData = ({ queryConfig, initialData }: UseUserOptions) => {
  return useQuery({
    ...getUsersQueryOptions(),
     initialData: initialData, 
    ...queryConfig,
  });
};
