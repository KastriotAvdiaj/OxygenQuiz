import { lazy, useMemo } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Header from "../common/Header";
import { AdminRoute } from "../lib/Auth";
import { AppRoot } from "../pages/AppRoot";
import { QueryClient, useQueryClient } from "@tanstack/react-query";

import { RedirectIfLoggedIn } from "../lib/Redirect";
import "../global.css";
import { Navigate } from "react-router-dom";
import { HomeLayout } from "@/pages/layout";

// Lazy load components
const Home = lazy(() =>
  import("../pages/Home/Home").then((module) => ({ default: module.Home }))
);
const AboutUs = lazy(() =>
  import("../pages/AboutUs/AboutUs").then((module) => ({
    default: module.AboutUs,
  }))
);
const Login = lazy(() => import("../pages/Login/Login"));
const Signup = lazy(() => import("../pages/Signup/Signup"));
const createAppRouter = (queryClient: QueryClient) =>
  createBrowserRouter([
    {
      path: "/",
      element: (
        <>
          <HomeLayout children={<Home />} />
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
          path: "quizzes",
          lazy: async () => {
            const { Quizzes } = await import(
              "../pages/Dashboard/Pages/Quiz/Quizzes"
            );
            return { Component: Quizzes };
          },
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
      ],
    },
    {
      path: "*",
      lazy: async () => {
        const { NotFoundRoute } = await import("../pages/NotFound/Not-Found");
        return { Component: NotFoundRoute };
      },
    },
  ]);

export function AppRouter() {
  const queryClient = useQueryClient();

  const router = useMemo(() => createAppRouter(queryClient), [queryClient]);

  return <RouterProvider router={router} />;
}
