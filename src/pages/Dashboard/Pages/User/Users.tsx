
// Users.tsx
import { QueryClient } from '@tanstack/react-query';
import { LoaderFunctionArgs } from 'react-router-dom';

export const usersLoader =
  (queryClient: QueryClient) =>
  async ({ request }: LoaderFunctionArgs) => {
    // Extract any necessary parameters from the request URL
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || 1);

    // Define your query options for fetching users
    // const query = getUsersQueryOptions({ page });

    // Fetch or return cached data
    return (
      queryClient.getQueryData(query.queryKey) ??
      (await queryClient.fetchQuery(query))
    );
  };

export const Users = () => {
  // Use the data from the loader if needed
  // const data = useLoaderData<typeof usersLoader>();

  return <div>Users</div>;
};
