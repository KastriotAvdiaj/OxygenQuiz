import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui/Spinner";
import { DashboardLayout } from "@/pages/Dashboard/DashboardLayout";
import { MainErrorFallback } from "./Error/Main";

export const AppRoot = () => {
  const location = useLocation();

  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="flex h-screen w-screen items-center justify-center">
            <Spinner size="xl" />
          </div>
        }
      >
        <ErrorBoundary key={location.pathname} fallback={<MainErrorFallback />}>
          <Outlet />
        </ErrorBoundary>
      </Suspense>
    </DashboardLayout>
  );
};
