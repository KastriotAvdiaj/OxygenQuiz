import { useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { getUsersQueryOptions, useUserData } from "./api/get-users";
import { Spinner } from "@/components/ui/Spinner";
import { columns } from "./Components/columns";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Plus, RefreshCw, Search } from "lucide-react";
import { StatsCards } from "./Components/stats-cards";
import CreateUserForm from "./Components/create-user";

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

  const users = usersQuery.data;

  if (!users) return null;

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 my-5 p-6">
      <StatsCards className="" />
      <Card className="p-5 bg-background-secondary border-none rounded-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Users Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between my-4">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Button variant="default" size="icon" className="rounded">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <CreateUserForm />

              <Button
                variant="default"
                size="sm"
                onClick={() => usersQuery.refetch()}
                className="bg-background"
              >
                <RefreshCw className="mr-2 h-4 w-4 " />
                Refresh
              </Button>

              <Button variant="default" size="sm" className="bg-background">
                <Download className="mr-2 h-4 w-4 " />
                Export
              </Button>
            </div>
          </div>
          <DataTable data={filteredUsers} columns={columns} />
        </CardContent>
      </Card>
    </div>
  );
};
