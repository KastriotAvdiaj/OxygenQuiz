import { redirect } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { getUser } from "./Auth";

export const dashboardEntryLoader = (queryClient: QueryClient) => async () => {
  const user = await queryClient.fetchQuery({
    queryKey: ["authenticated-user"],
    queryFn: getUser,
  });

  if (!user) return redirect("/login");

  const isAdmin = user.role === "Admin" || user.role === "SuperAdmin";
  return redirect(isAdmin ? "/dashboard" : "/my-dashboard");
};
