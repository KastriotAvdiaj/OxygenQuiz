import { redirect } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { getUser } from "../lib/Auth";

export const dashboardEntryLoader = (queryClient: QueryClient) => async () => {
  const user = await queryClient.fetchQuery({
    queryKey: ["authenticated-user"],
    queryFn: getUser,
  });

  if (!user) return redirect("/login");

  const isAdmin =
    user.roles?.includes("Admin") || user.roles?.includes("SuperAdmin");
  return redirect(isAdmin ? "/dashboard" : "/my-dashboard");
};
