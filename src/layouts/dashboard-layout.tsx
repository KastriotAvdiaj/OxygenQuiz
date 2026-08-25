import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/pages/Dashboard/Components/DashboardHeader";
import { DashboardNav } from "@/pages/Dashboard/Components/DashboardNav";
import type { DashboardNavItem } from "@/pages/Dashboard/Components/dashboardNavConfig";
import { cn } from "@/utils/cn";

interface DashboardLayoutProps {
  children: React.ReactNode;
  basePath: string; // "/dashboard" | "/my-dashboard"
  navItems: DashboardNavItem[];
  fullWidthPaths?: string[]; // paths that hide the nav (e.g. quiz creator)
  /**
   * Paths that additionally render with **no header** — see
   * docs/adr/0002-quiz-creation-routes-hide-the-dashboard-header.md.
   *
   * The header is 77px on a 730px laptop viewport, and on the AI wizard those 77px are
   * the difference between the Generate button being on screen and being below the fold.
   *
   * **A route may only enter focus mode if it has its own in-page way back.** Removing
   * the header removes Back, Home, the theme toggle and the account button at once; a
   * page with no escape of its own is left with the browser's Back button and nothing
   * else. Both AI routes carry their own Back control, which is why they qualify — and
   * why the manual creator and the edit form (which do not) are deliberately absent from
   * this list even though they share the full-width branch.
   *
   * Prefix-matched, like `fullWidthPaths`.
   */
  focusPaths?: string[];
}

export const DashboardLayout = ({
  children,
  basePath,
  navItems,
  fullWidthPaths = [],
  focusPaths = [],
}: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // Responsive: collapse to an icon rail on narrower viewports, expand back on
  // wide ones. Users can still toggle manually within a breakpoint.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const apply = (matches: boolean) => setIsNavCollapsed(matches);
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setActivePage = (page: string) => {
    navigate(`${basePath}/${page}`);
  };

  const activePage = location.pathname.split("/").pop() || "";
  // Exact match, or prefix match for parameterised paths (e.g. .../edit-quiz/:quizId).
  const matchesPath = (paths: string[]) =>
    paths.some(
      (path) =>
        location.pathname === path || location.pathname.startsWith(`${path}/`)
    );

  const isFullWidth = matchesPath(fullWidthPaths);
  // Focus mode is a stricter case of full width: no nav *and* no header. It never
  // applies on its own, so a path listed here must also be full width.
  const isFocusMode = isFullWidth && matchesPath(focusPaths);

  if (isFullWidth) {
    return (
      <div className="text-foreground h-screen flex flex-col">
        {/* No header in focus mode. The page owns the whole viewport and provides its
            own way back — see the `focusPaths` doc comment and ADR 0002. */}
        {!isFocusMode && (
          <header className="flex-none">
            <DashboardHeader />
          </header>
        )}

        {/* `short:p-4` halves the vertical gutter on a short viewport. This padding had
            width steps only, so a laptop that is wide but short paid the full 64px —
            and none of the `short:` work done on the wizard itself could reach it
            (docs/RESPONSIVE.md, "Short viewports"). */}
        <main className="flex-1 overflow-y-auto bg-muted p-4 sm:p-6 lg:p-8 short:p-4">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="text-foreground h-screen flex flex-col">
      <header className="flex-none">
        <DashboardHeader />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={cn(
            "bg-background relative flex-none overflow-hidden border-r border-border transition-[width] duration-300 ease-in-out",
            isNavCollapsed ? "w-[76px]" : "w-64"
          )}
          aria-label="Dashboard navigation">
          <DashboardNav
            navItems={navItems}
            setActivePage={setActivePage}
            activePage={activePage}
            isCollapsed={isNavCollapsed}
            setIsCollapsed={setIsNavCollapsed}
          />
        </aside>

        <main className="flex-1 overflow-y-auto bg-muted p-10">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
