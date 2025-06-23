import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/pages/Dashboard/Components/DashboardHeader";
import { DashboardNav } from "@/pages/Dashboard/Components/DashboardNav";

const QUIZ_CREATOR_PATH = "/dashboard/quizzes/create-quiz";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  const setActivePage = (page: string) => {
    navigate(`/dashboard/${page}`);
  };

  const isQuizCreatorPage = location.pathname === QUIZ_CREATOR_PATH;
  const activePage = location.pathname.split("/").pop() || "questions";

  // If it's the quiz creator page, render a simpler layout
  if (isQuizCreatorPage) {
    return (
      <div className="text-foreground h-screen overflow-hidden">
        <main className="h-full overflow-y-auto bg-muted">
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
          className={`
            bg-background relative shadow-md transition-all duration-300 ease-in-out flex-none
            ${isNavCollapsed ? "w-20" : "w-64"}
          `}
          aria-label="Dashboard navigation"
        >
          <DashboardNav
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
