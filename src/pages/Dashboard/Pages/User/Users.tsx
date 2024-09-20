import { QueryClient, useQuery } from "@tanstack/react-query";
import { getUsersQueryOptions } from "./api/getUsersQueryOptions";
import { QueryConfig } from "@/lib/React-query";

export const usersLoader = (queryClient: QueryClient) => async () => {
  const query = getUsersQueryOptions();

  return (
    queryClient.getQueryData(query.queryKey) ??
    (await queryClient.fetchQuery(query))
  );
};

type UseUsersOptions = {
  queryConfig?: QueryConfig<typeof getUsersQueryOptions>;
};

export const useUsers = ({ queryConfig }: UseUsersOptions) => {
  return useQuery({
    ...getUsersQueryOptions(),
    ...queryConfig,
  });
};
