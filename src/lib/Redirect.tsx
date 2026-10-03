import { Navigate, useSearchParams } from "react-router-dom";
import { useUser } from "./Auth";
import { safeRedirectPath } from "./safe-redirect";

export const RedirectIfLoggedIn = ({
  component,
}: {
  component: JSX.Element;
}) => {
  const user = useUser();
  const [searchParams] = useSearchParams();

  if (user?.data) {
    const { roles } = user.data;

    // Only a path on this site (safe-redirect.ts): the parameter is anyone's to write.
    const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    if (roles?.includes("SuperAdmin")) {
      return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return component;
};
