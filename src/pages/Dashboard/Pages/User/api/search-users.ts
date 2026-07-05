import { queryOptions, useQuery } from "@tanstack/react-query";
import { QueryConfig } from "@/lib/React-query";
import { fetchPaged, type FilterQuery, type PagedResponse } from "@/lib/filtering";
import { User } from "@/types/user-types";

// Admin-only filtered user search over the shared framework (see docs/quiz/filtering.md).
export const searchUsers = (query: FilterQuery): Promise<PagedResponse<User>> =>
  fetchPaged<User>("/users/search", query);

export const searchUsersQueryOptions = (query: FilterQuery = {}) =>
  queryOptions({
    queryKey: ["users", "search", query],
    queryFn: () => searchUsers(query),
  });

export const useSearchUsers = ({
  query,
  queryConfig,
}: {
  query?: FilterQuery;
  queryConfig?: QueryConfig<typeof searchUsersQueryOptions>;
} = {}) =>
  useQuery({
    ...searchUsersQueryOptions(query),
    ...queryConfig,
  });
