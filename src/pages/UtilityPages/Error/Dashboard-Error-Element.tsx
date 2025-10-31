import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { NotFoundContent } from "../NotFound/Not-Found-Content";
import { MainErrorFallback } from "./Main";

export const DashboardErrorElement = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
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
