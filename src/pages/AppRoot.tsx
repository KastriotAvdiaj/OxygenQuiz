import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui/Spinner";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { MainErrorFallback } from "./UtilityPages/Error/Main";
import type { DashboardNavItem } from "./Dashboard/Components/dashboardNavConfig";

type AppRootProps = {
  basePath: string;
  navItems: DashboardNavItem[];
  fullWidthPaths?: string[];
};

export const AppRoot = ({ basePath, navItems, fullWidthPaths }: AppRootProps) => {
  const location = useLocation();

  return (
    <DashboardLayout basePath={basePath} navItems={navItems} fullWidthPaths={fullWidthPaths}>
      <Suspense
        fallback={
          <div className="flex h-screen w-screen items-center justify-center">
            <Spinner size="xl" />
          </div>
        }>
        <ErrorBoundary
          key={location.pathname}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <MainErrorFallback
              error={error}
              resetErrorBoundary={resetErrorBoundary}
            />
          )}>
          <Outlet />
        </ErrorBoundary>
      </Suspense>
    </DashboardLayout>
  );
};
