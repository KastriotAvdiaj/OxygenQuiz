import { useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { getUsersQueryOptions, useUserData } from "./api/get-users";
import { Spinner } from "@/components/ui/Spinner";
import { columns } from "./Components/columns";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCards } from "./Components/stats-cards";
import { UserControls } from "./Components/user-page-button-group";

export const usersLoader = (queryClient: QueryClient) => async () => {
  const query = getUsersQueryOptions();
  return (
    queryClient.getQueryData(query.queryKey) ??
    (await queryClient.fetchQuery(query))
  );
};

export const Users = () => {
  const usersQuery = useUserData({});
  const [searchTerm, setSearchTerm] = useState("");

  if (usersQuery.isLoading) {
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (usersQuery.isError) {
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <p className="text-red-500">
          Failed to load users. Please try again later.
        </p>
      </div>
    );
  }

  const users = usersQuery.data;
  console.log(users);

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
