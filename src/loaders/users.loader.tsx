import { QueryClient } from "@tanstack/react-query";
import { getUsersQueryOptions } from "@/pages/Dashboard/Pages/User/api/get-users";
import { handleLoaderError } from "@/lib/loaderError";

export const usersLoader = (queryClient: QueryClient) => async () => {
  const query = getUsersQueryOptions();

  const users = await handleLoaderError(() =>
    queryClient.ensureQueryData(query)
  );

  //TODO: Pagination can be added later if needed
  //TODO: When user is logged out and in the dashboard page, they can still see the data. Fix that.
  // 4. Return the data in an object (best practice)
  return { users };
};
