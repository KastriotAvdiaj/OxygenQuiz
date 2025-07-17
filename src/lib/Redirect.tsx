import { Navigate, useSearchParams } from "react-router-dom";
import { useUser } from "./Auth";

export const RedirectIfLoggedIn = ({
  component,
}: {
  component: JSX.Element;
}) => {
  const user = useUser();
  const [searchParams] = useSearchParams();

  if (user?.data) {
    const { role } = user.data;

    const redirectTo = searchParams.get("redirectTo");

    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    if (role === "SuperAdmin") {
      return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return component;
};
