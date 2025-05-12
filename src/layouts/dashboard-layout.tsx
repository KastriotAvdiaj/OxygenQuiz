import { useState } from "react";
import { DashboardHeader } from "@/pages/Dashboard/Components/DashboardHeader";
import { DashboardNav } from "@/pages/Dashboard/Components/DashboardNav";
import { useNavigate } from "react-router";

export const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const navigate = useNavigate();
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  const setActivePage = (page: string) => {
    navigate(`/dashboard/${page}`);
  };

  const isQuizCreatorPage =
    location.pathname === "/dashboard/quizzes/create-quiz";

  return (
    <div
      className={`text-foreground ${
        !isQuizCreatorPage
          ? "grid grid-rows-[auto_1fr] h-screen"
          : ""
      }`}
      style={{
        gridTemplateColumns: !isQuizCreatorPage
          ? isNavCollapsed
            ? "5rem 1fr"
            : "16rem 1fr"
          : "1fr"
      }}
    >
      <div className={`${!isQuizCreatorPage ? "col-span-2" : ""}`}>
        <DashboardHeader />
      </div>
      
      {!isQuizCreatorPage && (
        <div className="bg-background relative shadow-md h-full transition-all duration-300 ease-in-out">
          <DashboardNav
            setActivePage={setActivePage}
            activePage={location.pathname.split("/").pop() || "application"}
            isCollapsed={isNavCollapsed}
            setIsCollapsed={setIsNavCollapsed}
          />
        </div>
      )}
      
      <div
        className="overflow-y-auto bg-muted h-full p-10"
        style={{ maxHeight: "calc(100vh - 64px)" }}
      >
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;