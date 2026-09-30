import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { NotFoundContent } from "../NotFound/Not-Found-Content";
import { NotFoundRoute } from "../NotFound/Not-Found";
import { MainErrorFallback } from "./Main-Error-Boundary";

export const DashboardErrorElement = () => {
  const error = useRouteError();

  // A "Hidden" 404 comes from the admin-dashboard gate denying a non-admin. Render the app's
  // generic not-found so the area is indistinguishable from a route that doesn't exist —
  // no dashboard-flavored copy or "Go to Dashboard" link that would admit it's there.
  if (isRouteErrorResponse(error) && error.status === 404 && error.statusText === "Hidden") {
    return <NotFoundRoute />;
  }

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <NotFoundContent
        fullViewport={false}
        title="Not found"
        message="The quiz or question you're looking for couldn't be found. It may have been deleted."
        linkText="Go to Dashboard"
        linkTo="/dashboard"
      />
    );
  }

  // Generic fallback for unexpected errors
  return <MainErrorFallback error={error} resetErrorBoundary={() => {}} />;
};
