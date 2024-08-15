import { useState } from "react";
import { DashboardNav } from "@/componentsOurs/DashboardNav";
import { DashboardHeader } from "@/componentsOurs/DashboardHeader";
import { Application } from "./DashboardPages/Application";
import { Questions } from "./DashboardPages/Questions";
import { Quizzes } from "./DashboardPages/Quizzes";
import { Users } from "./DashboardPages/Users";

export const Dashboard = () => {
  const [activePage, setActivePage] = useState("Application");

  const renderContent = () => {
    switch (activePage) {
      case "Application":
        return <Application />;
      case "Questions":
        return <Questions />;
      case "Quizzes":
        return <Quizzes />;
      case "Users":
        return <Users />;
      default:
        return <Application />;
    }
  };

  return (
    <div className="h-screen text-white bg-[var(--dashboard)] grid grid-cols-[16%_84%] grid-rows-[auto_1fr]">
      <div className="col-span-2 ">
        <DashboardHeader />
      </div>
      <div className="mt-10">
        <DashboardNav setActivePage={setActivePage} />
      </div>
      <div className="bg-[var(--dashboard-darker)]">{renderContent()}</div>
    </div>
  );
};
