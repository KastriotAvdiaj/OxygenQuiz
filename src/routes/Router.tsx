import { lazy, useMemo } from "react";
import {
  createBrowserRouter,
  LoaderFunctionArgs,
  RouterProvider,
} from "react-router-dom";
import { AdminRoute } from "../lib/Auth";
import { AppRoot } from "../pages/AppRoot";
import { QueryClient, useQueryClient } from "@tanstack/react-query";

import { RedirectIfLoggedIn } from "../lib/Redirect";
import "../global.css";
import { Navigate } from "react-router-dom";
import { HomeLayout } from "@/layouts/layout";
import QuizCreator from "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/create-quiz";

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
const createAppRouter = (queryClient: QueryClient) =>
  createBrowserRouter([
    {
      path: "/",
      element: (
        <>
          <HomeLayout squares={true} children={<Home />} />
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
      path: "/signup",
      element: <RedirectIfLoggedIn component={<Signup />} />,
    },
    {
      path: "/login",
      element: <RedirectIfLoggedIn component={<Login />} />,
    },
    {
      path: "/dashboard/*",
      element: (
        <AdminRoute>
          <AppRoot />
        </AdminRoute>
      ),
      children: [
        {
          index: true,
          element: <Navigate to="/dashboard/application" replace />,
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
        {
          path: "questions/:questionId",
          lazy: async () => {
            const { QuestionRoute } = await import(
              "../pages/Dashboard/Pages/Question/Question"
            );
            return { Component: QuestionRoute };
          },
          loader: async (args: LoaderFunctionArgs) => {
            const { questionLoader } = await import(
              "../pages/Dashboard/Pages/Question/Question"
            );
            return questionLoader(queryClient)(args);
          },
        },
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
          element: <QuizCreator />,
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
