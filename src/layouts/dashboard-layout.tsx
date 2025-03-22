import { DashboardHeader } from "@/pages/Dashboard/Components/DashboardHeader";
import { DashboardNav } from "@/pages/Dashboard/Components/DashboardNav";
import { useNavigate } from "react-router";

export const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const navigate = useNavigate();

  const setActivePage = (page: string) => {
    navigate(`/dashboard/${page}`);
  };
  const isQuizCreatorPage =
    location.pathname === "/dashboard/quizzes/create-quiz";
  return (
    <div
      className={`${
        !isQuizCreatorPage &&
        `grid grid-cols-[16%_84%] grid-rows-[auto_1fr] h-screen`
      } text-foreground`}
    >
      <div className="col-span-2">
        <DashboardHeader />
      </div>
      {!isQuizCreatorPage && (
        <div className="bg-background relative shadow-md">
          <DashboardNav
            setActivePage={setActivePage}
            activePage={location.pathname.split("/").pop() || "application"}
          />
        </div>
      )}
      <div
        className="overflow-y-auto bg-muted h-screen p-10"
        style={{ maxHeight: "calc(100vh - 64px)" }} // I don't think this does anything
      >
        {children}
      </div>
    </div>
  );
};
