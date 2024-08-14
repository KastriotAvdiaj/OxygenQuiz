import { DashboardNav } from "@/componentsOurs/DashboardNav";
import { DashboardHeader } from "@/componentsOurs/DashboardHeader";

export const Dashboard = () => {
  return (
    <div className="h-screen text-white bg-[var(--dashboard)] grid grid-cols-[16%_84%] grid-rows-[auto_1fr]">
      <div className="col-span-2 ">
        <DashboardHeader />
      </div>
      <div className="mt-10">
        <DashboardNav />
      </div>
      <div className="bg-[var(--dashboard-darker)]">Column 2 (84%)</div>
    </div>
  );
};
