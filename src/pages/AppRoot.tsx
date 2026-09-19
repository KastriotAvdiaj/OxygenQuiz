import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui/Spinner";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { MainErrorFallback } from "./UtilityPages/Error/Main-Error-Boundary";
import type { DashboardNavItem } from "./Dashboard/Components/dashboardNavConfig";
import { AccountOverlay } from "./UserRelated/AccountOverlay/AccountOverlay";

type AppRootProps = {
  basePath: string;
  navItems: DashboardNavItem[];
  fullWidthPaths?: string[];
  /** Routes that render with no header at all — see DashboardLayout's `focusPaths`. */
  focusPaths?: string[];
};

export const AppRoot = ({ basePath, navItems, fullWidthPaths, focusPaths }: AppRootProps) => {
  const location = useLocation();

  return (
    <DashboardLayout
      basePath={basePath}
      navItems={navItems}
      fullWidthPaths={fullWidthPaths}
      focusPaths={focusPaths}>
      <Suspense
        fallback={
          // Fills the dashboard's content column. h-screen/w-screen here made the
          // spinner centre on the *viewport*, i.e. behind the sidebar and under the
          // header, so it visibly jumped into place when the page took over.
          <div className="flex min-h-[60vh] w-full items-center justify-center">
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

      {/* Same overlay as the public shell — the dashboard is a separate layout, so it
          needs its own mount point for ?settings=… to work from here too. */}
      <AccountOverlay />
    </DashboardLayout>
  );
};
