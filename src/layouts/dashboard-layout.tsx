import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/pages/Dashboard/Components/DashboardHeader";
import { DashboardNav } from "@/pages/Dashboard/Components/DashboardNav";
import type { DashboardNavItem } from "@/pages/Dashboard/Components/dashboardNavConfig";

interface DashboardLayoutProps {
  children: React.ReactNode;
  basePath: string; // "/dashboard" | "/my-dashboard"
  navItems: DashboardNavItem[];
  fullWidthPaths?: string[]; // paths that hide the nav (e.g. quiz creator)
}

export const DashboardLayout = ({
  children,
  basePath,
  navItems,
  fullWidthPaths = [],
}: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  const setActivePage = (page: string) => {
    navigate(`${basePath}/${page}`);
  };

  const activePage = location.pathname.split("/").pop() || "";
  const isFullWidth = fullWidthPaths.includes(location.pathname);

  if (isFullWidth) {
    // Show header but no nav
    return (
      <div className="text-foreground h-screen flex flex-col">
        <header className="flex-none">
          <DashboardHeader />
        </header>

        <main className="flex-1 overflow-y-auto bg-muted p-10">{children}</main>
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
          className={`
            bg-background relative shadow-md transition-all duration-300 ease-in-out flex-none
            ${isNavCollapsed ? "w-20" : "w-64"}
          `}
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
