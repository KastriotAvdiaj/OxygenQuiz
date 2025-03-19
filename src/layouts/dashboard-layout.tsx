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
    <div className="grid grid-cols-[16%_84%] grid-rows-[auto_1fr] h-screen text-foreground">
      <div className="col-span-2">
        <DashboardHeader />
      </div>
      <div className="bg-background relative shadow-md">
        <DashboardNav
          setActivePage={setActivePage}
          activePage={location.pathname.split("/").pop() || "application"}
        />
      </div>
      <div
        className="overflow-y-auto bg-muted p-10"
        style={{ maxHeight: "calc(100vh - 64px)" }} // Adjust 64px to header height
      >
        {children}
      </div>
    </div>
  );
};
