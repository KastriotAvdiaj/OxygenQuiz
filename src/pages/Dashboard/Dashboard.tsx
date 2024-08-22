import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { DashboardNav } from "@/pages/Dashboard/Components/DashboardNav";
import { DashboardHeader } from "./Components/DashboardHeader";

// Lazy load sub-pages
const Application = lazy(() =>
  import("./Pages/Application/Application").then((module) => ({
    default: module.Application,
  }))
);
const Questions = lazy(() =>
  import("./Pages/Question/Questions").then((module) => ({
    default: module.Questions,
  }))
);
const Quizzes = lazy(() =>
  import("./Pages/Quiz/Quizzes").then((module) => ({ default: module.Quizzes }))
);
const Users = lazy(() =>
  import("./Pages/User/Users").then((module) => ({ default: module.Users }))
);

export const Dashboard = () => {
  const navigate = useNavigate();

  const setActivePage = (page: string) => {
    console.log(`/dashboard/${page}`);
    navigate(`/dashboard/${page}`);
  };

  return (
    <div className="grid grid-cols-[16%_84%] grid-rows-[auto_1fr] h-[100vh]">
      <div className="col-span-2 bg-[var(--background-secondary)]">
        <DashboardHeader />
      </div>
      <div className="h-full bg-[var(--background-secondary)]">
        <DashboardNav
          setActivePage={setActivePage}
          activePage={location.pathname.split("/").pop() || "application"}
        />
      </div>
      <div className="overflow-y-auto">
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route index element={<Navigate to="application" replace />} />
            <Route path="application" element={<Application />} />
            <Route path="questions" element={<Questions />} />
            <Route path="quizzes" element={<Quizzes />} />
            <Route path="users" element={<Users />} />
            <Route path="*" element={<Navigate to="application" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
};
