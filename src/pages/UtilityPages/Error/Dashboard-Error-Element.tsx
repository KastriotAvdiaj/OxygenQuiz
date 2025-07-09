// src/errors/DashboardErrorElement.tsx

import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { NotFoundContent } from "../NotFound/Not-Found-Content";
import { Button } from "@/components/ui/button"; // NEW: Import the Button component
import { MainErrorFallback } from "./Main";

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

  // NEW: Add a check for 401 Unauthorized errors
  if (isRouteErrorResponse(error) && error.status === 401) {
    return (
      <div
        className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4"
        role="alert"
      >
        <h2 className="text-lg font-semibold text-red-500">
          You are not authorized to view this page
        </h2>
        <p className="text-sm text-muted-foreground">
          Your session may have expired. Please log in again.
        </p>
        <Button
          className="mt-4"
          onClick={() => {
            // Redirect to the login page, clearing history.
            window.location.href = "/login";
          }}
        >
          Login
        </Button>
      </div>
    );
  }

  // For all other errors (500, etc.), render the generic fallback.
  // The user's only recourse is to navigate away or refresh.
  return <MainErrorFallback error={error} resetErrorBoundary={() => {}} />;
};