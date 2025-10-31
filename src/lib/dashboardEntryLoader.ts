import { redirect } from "react-router-dom";
import { useUser } from "./Auth";

export const dashboardEntryLoader = () => async () => {
  const { data: user } = useUser();

  if (!user) return redirect("/login");

  const isAdmin = user.role === "Admin" || user.role === "SuperAdmin";
  return redirect(isAdmin ? "/dashboard" : "/my-dashboard");
};
