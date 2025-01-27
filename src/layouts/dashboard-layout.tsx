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
  return (
    <div className="grid grid-cols-[16%_84%] grid-rows-[auto_1fr] h-[100vh]">
      <div className="col-span-2">
        <DashboardHeader />
      </div>
      <div className="h-full bg-background-secondary z-8 relative shadow-md">
        <DashboardNav
          setActivePage={setActivePage}
          activePage={location.pathname.split("/").pop() || "application"}
        />
      </div>
      <div className="overflow-y-auto h-full">{children}</div>
    </div>
  );
};
