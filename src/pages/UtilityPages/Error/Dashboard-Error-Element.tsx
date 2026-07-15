import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { NotFoundContent } from "../NotFound/Not-Found-Content";
import { NotFoundRoute } from "../NotFound/Not-Found";
import { MainErrorFallback } from "./Main-Error-Boundary";
import { getErrorFontClass } from "../errorFontZone";

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
      <div className={`${getErrorFontClass()} flex h-full w-full items-center justify-center p-4`}>
        <NotFoundContent
          title="Resource Not Found"
          message={`"The item you are looking for (e.g., a quiz or question) could not be found. It may have been deleted." ${error.statusText}`}
          linkText="Go to Dashboard"
          linkTo="/dashboard"
        />
      </div>
    );
  }

  // Generic fallback for unexpected errors
  return <MainErrorFallback error={error} resetErrorBoundary={() => {}} />;
};
