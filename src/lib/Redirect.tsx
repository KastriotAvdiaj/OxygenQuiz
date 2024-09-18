import { Navigate } from "react-router-dom";
import { useUser } from "./Auth";

export const RedirectIfLoggedIn = ({ component }: { component: JSX.Element }) => {
  const user = useUser();

  if (user?.data) {
    return <Navigate to="/dashboard" replace />;
  }

  return component;
};
