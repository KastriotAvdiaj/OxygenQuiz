import { useState } from "react";
import { DashboardNav } from "@/pages/Dashboard/Components/DashboardNav";
import { DashboardHeader } from "./Components/DashboardHeader";
import { Application } from "./Pages/Application/Application";
import { Questions } from "./Pages/Question/Questions";
import { Quizzes } from "./Pages/Quiz/Quizzes";
import { Users } from "./Pages/User/Users";

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
    <div className="grid grid-cols-[16%_84%] grid-rows-[auto_1fr] h-[100vh]">
      <div className="col-span-2 bg-[var(--background-secondary)]">
        <DashboardHeader />
      </div>
      <div className="h-full bg-[var(--background-secondary)]">
        <DashboardNav setActivePage={setActivePage} activePage={activePage} />
      </div>
      <div className="overflow-y-auto">{renderContent()}</div>
    </div>
  );
};
