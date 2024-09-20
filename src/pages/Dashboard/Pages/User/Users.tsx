import { QueryClient } from "@tanstack/react-query";
import { getUsersQueryOptions } from "./api/getUsersQueryOptions";
import { useUserData } from "./api/getUsersQueryOptions";
import { Spinner } from "@/components/ui/Spinnter";
import { columns } from "./Components/columns";
import { DataTable } from "@/components/ui/data-table";

export const usersLoader = (queryClient: QueryClient) => async () => {
  const query = getUsersQueryOptions();

  return (
    queryClient.getQueryData(query.queryKey) ??
    (await queryClient.fetchQuery(query))
  );
};

export const Users = () => {
  const usersQuery = useUserData({});

  if (usersQuery.isLoading) {
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const users = usersQuery.data;

  if (!users) return null;

  return (
    <div>
      <h2>Users List</h2>
      <DataTable data={users} columns={columns} />
    </div>
  );
};
