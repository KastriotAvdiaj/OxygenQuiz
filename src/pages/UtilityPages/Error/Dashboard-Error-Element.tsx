import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { MainErrorFallback } from "./Main";
import { NotFoundContent } from "../NotFound/Not-Found-Content";

export const DashboardErrorElement = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <NotFoundContent
          title="Resource Not Found"
          message="The item you are looking for (e.g., a quiz or question) could not be found. It may have been deleted."
          linkText="Go to Dashboard"
          linkTo="/dashboard"
        />
      </div>
    );
  }

  // For all other errors (500, etc.), render a generic "something went wrong" boundary.
  // We pass a dummy reset function because we can't reset the router state from here easily.
  // The user's only recourse is to navigate away.
  return <MainErrorFallback error={error} resetErrorBoundary={() => {}} />;
};
