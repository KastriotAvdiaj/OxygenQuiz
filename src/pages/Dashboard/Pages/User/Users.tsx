import { useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { useLoaderData } from "react-router-dom"; // 1. Import useLoaderData
import { getUsersQueryOptions, useUserData } from "./api/get-users";
import { User } from "@/types/user-types"; // Assuming this is your user type

// UI Components
import { Spinner } from "@/components/ui/Spinner";
import { columns } from "./Components/columns";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCards } from "./Components/stats-cards";
import { UserControls } from "./Components/user-page-button-group";
import { handleLoaderError } from "@/lib/loaderError";

// 3. Refactor the loader to use the helper
export const usersLoader = (queryClient: QueryClient) => async () => {
  const query = getUsersQueryOptions();

  const users = await handleLoaderError(() => {
    const cachedData = queryClient.getQueryData(query.queryKey);
    return cachedData
      ? Promise.resolve(cachedData)
      : queryClient.fetchQuery(query);
  });
  
  //TODO: Pagination can be added later if needed
  //TODO: When user is logged out and in the dashboard page, they can still see the data. Fix that.
  // 4. Return the data in an object (best practice)
  return { users };
};

export const Users = () => {
  const { users: initialUsers } = useLoaderData() as { users: User[] };

  const usersQuery = useUserData({
    initialData: initialUsers,
  });
  
  const [searchTerm, setSearchTerm] = useState("");

  // This `isLoading` will now only be true for background refetches, not the initial render
  if (usersQuery.isLoading) {
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // This handles errors from subsequent background refetches
  if (usersQuery.isError) {
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <p className="text-red-500">
          Failed to refresh user data. Please try again later.
        </p>
      </div>
    );
  }

  // The rest of your component logic remains the same
  const users = usersQuery.data;
  if (!users) return null;

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 p-6">
      <StatsCards />
      <Card className="p-5 bg-background border-none rounded-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Users Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <UserControls
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onRefresh={() => usersQuery.refetch()}
          />
          <DataTable data={filteredUsers} columns={columns} />
        </CardContent>
      </Card>
    </div>
  );
};