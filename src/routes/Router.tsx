import { lazy, useMemo } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { adminAuthLoader, userAuthLoader } from "../lib/Auth";
import { AppRoot } from "../pages/AppRoot";
import { QueryClient, useQueryClient } from "@tanstack/react-query";

import { RedirectIfLoggedIn } from "../lib/Redirect";
import "../global.css";
import { Navigate } from "react-router-dom";
import { HomeLayout } from "@/layouts/layout";
import QuizCreator from "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/create-quiz";
import {
  QuizSelection,
  quizSelectionLoader,
} from "@/pages/Quiz/Quiz-Selection";
import { QuizQuestionProvider } from "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/Quiz-questions-context";
import { DashboardErrorElement } from "@/pages/UtilityPages/Error/Dashboard-Error-Element";
import { quizLoader } from "../pages/Dashboard/Pages/Quiz/Quiz";
import { QuizPageRouteWrapper } from "@/pages/Quiz/Sessions/components/quiz-page-route-wrapper";

// Lazy load components
const Home = lazy(() =>
  import("../pages/Home/Home").then((module) => ({ default: module.Home }))
);
const AboutUs = lazy(() =>
  import("../pages/AboutUs/AboutUs").then((module) => ({
    default: module.AboutUs,
  }))
);
const Login = lazy(() => import("../pages/UserRelated/Login/Login"));
const Signup = lazy(() => import("../pages/UserRelated/Signup/Signup"));
const AccessDeniedPage = lazy(() =>
  import("../pages/UtilityPages/AccessDenied").then((module) => ({
    default: module.AccessDeniedPage,
  }))
);
const createAppRouter = (queryClient: QueryClient) =>
  createBrowserRouter([
    {
      path: "/",
      element: (
        <>
          <HomeLayout headerColor={false} squares={true} children={<Home />} />
        </>
      ),
    },
    {
      path: "/about-us",
      element: (
        <>
          <HomeLayout children={<AboutUs />} />
        </>
      ),
    },
    {
      path: "/choose-quiz",
      loader: quizSelectionLoader(queryClient),
      errorElement: <DashboardErrorElement />,
      element: (
        <>
          <HomeLayout children={<QuizSelection />} headerColor={false} />
        </>
      ),
    },
    {
      path: "/quiz/:quizId/play",
      errorElement: <DashboardErrorElement />,
      loader: userAuthLoader(queryClient),
      element: (
        <>
          <HomeLayout children={<QuizPageRouteWrapper />} headerColor={false} />
        </>
      ),
    },
    {
      path: "/signup",
      element: <RedirectIfLoggedIn component={<Signup />} />,
    },
    {
      path: "/login",
      element: <RedirectIfLoggedIn component={<Login />} />,
    },
    {
      path: "/access-denied",
      element: <AccessDeniedPage />,
    },
    {
      path: "/dashboard/*",
      element: <AppRoot />,
      id: "dashboardRoot",
      loader: adminAuthLoader(queryClient),
      errorElement: <DashboardErrorElement />,
      children: [
        {
          index: true,
          element: <Navigate to="/dashboard/questions" replace />,
        },
        {
          path: "application",
          lazy: async () => {
            const { Application } = await import(
              "../pages/Dashboard/Pages/Application/Application"
            );
            return { Component: Application };
          },
        },
        {
          path: "questions",
          lazy: async () => {
            const { Questions } = await import(
              "../pages/Dashboard/Pages/Question/Questions"
            );
            return { Component: Questions };
          },
        },
        // {
        //   path: "questions/:questionId",
        //   lazy: async () => {
        //     const { QuestionRoute } = await import(
        //       "../pages/Dashboard/Pages/Question/Question"
        //     );
        //     return { Component: QuestionRoute };
        //   },
        //   loader: async (args: LoaderFunctionArgs) => {
        //     const { questionLoader } = await import(
        //       "../pages/Dashboard/Pages/Question/Question"
        //     );
        //     return questionLoader(queryClient)(args);
        //   },
        // },
        {
          path: "quizzes",
          lazy: async () => {
            const { Quizzes } = await import(
              "../pages/Dashboard/Pages/Quiz/Quizzes"
            );
            return { Component: Quizzes };
          },
        },
        {
          path: "quizzes/create-quiz",
          element: (
            <QuizQuestionProvider>
              <QuizCreator />
            </QuizQuestionProvider>
          ),
        },
        {
          path: "quiz/:quizId",
          lazy: async () => {
            const { QuizRoute } = await import(
              "../pages/Dashboard/Pages/Quiz/Quiz"
            );
            return { Component: QuizRoute };
          },
          loader: quizLoader(queryClient),
        },
        {
          path: "permissions",
          lazy: async () => {
            const { Permissions } = await import(
              "../pages/Dashboard/Pages/Permissions/Permissions"
            );
            return { Component: Permissions };
          },
        },
        {
          path: "users",
          lazy: async () => {
            const { Users } = await import(
              "../pages/Dashboard/Pages/User/Users"
            );
            return { Component: Users };
          },
          loader: async () => {
            const { usersLoader } = await import(
              "../pages/Dashboard/Pages/User/Users"
            );
            return usersLoader(queryClient);
          },
        },
        {
          path: "*",
          lazy: async () => {
            const { NotFoundRoute } = await import(
              "../pages/UtilityPages/NotFound/Not-Found"
            );
            return { Component: NotFoundRoute };
          },
        },
      ],
    },
    {
      path: "my-profile",
      lazy: async () => {
        const { ProfileWrapper } = await import(
          "../pages/UserRelated/Profile/ProfileWrapper"
        );
        return { Component: ProfileWrapper };
      },
    },
    {
      path: "*",
      lazy: async () => {
        const { NotFoundRoute } = await import(
          "../pages/UtilityPages/NotFound/Not-Found"
        );
        return { Component: NotFoundRoute };
      },
    },
  ]);

export function AppRouter() {
  const queryClient = useQueryClient();

  const router = useMemo(() => createAppRouter(queryClient), [queryClient]);

  return <RouterProvider router={router} />;
}
