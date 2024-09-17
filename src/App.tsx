import { lazy, Suspense, useMemo } from "react";
import { AppProvider } from "./Provider";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Header from "./common/Header";
import { ProtectedRoute } from "./lib/Auth";
import { AppRoot } from "./pages/AppRoot";

import "./global.css";
import { Spinner } from "./components/ui/Spinnter";
import { Navigate } from "react-router-dom";

// Lazy load components
const Home = lazy(() =>
  import("./pages/Home/Home").then((module) => ({ default: module.Home }))
);
const AboutUs = lazy(() =>
  import("./pages/AboutUs/AboutUs").then((module) => ({
    default: module.AboutUs,
  }))
);
const Login = lazy(() => import("./pages/Login/Login"));
const Signup = lazy(() => import("./pages/Signup/Signup"));

const createAppRouter = () =>
  createBrowserRouter([
    {
      path: "/",
      element: (
        <>
          <Header />
          <Suspense
            fallback={
              <div className="flex h-screen w-screen items-center justify-center">
                <Spinner size="xl" />
              </div>
            }
          >
            <Home />
          </Suspense>
        </>
      ),
    },
    {
      path: "/about-us",
      element: (
        <>
          <Header />
          <Suspense
            fallback={
              <div className="flex h-screen w-screen items-center justify-center">
                <Spinner size="xl" />
              </div>
            }
          >
            <AboutUs />
          </Suspense>
        </>
      ),
    },

    {
      path: "/signup",
      element: (
        <>
          <Suspense
            fallback={
              <div className="flex h-screen w-screen items-center justify-center">
                <Spinner size="xl" />
              </div>
            }
          >
            <Signup />
          </Suspense>
        </>
      ),
    },
    {
      path: "/login",
      element: (
        <>
          <Suspense
            fallback={
              <div className="flex h-screen w-screen items-center justify-center">
                <Spinner size="xl" />
              </div>
            }
          >
            <Login />
          </Suspense>
        </>
      ),
    },
    {
      path: "/dashboard/*",
      element: (
        <ProtectedRoute>
          <AppRoot />
        </ProtectedRoute>
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
              "./pages/Dashboard/Pages/Application/Application"
            );
            return { Component: Application };
          },
        },
        {
          path: "questions",
          lazy: async () => {
            const { Questions } = await import(
              "./pages/Dashboard/Pages/Question/Questions"
            );
            return { Component: Questions };
          },
        },
        {
          path: "quizzes",
          lazy: async () => {
            const { Quizzes } = await import(
              "./pages/Dashboard/Pages/Quiz/Quizzes"
            );
            return { Component: Quizzes };
          },
        },
        {
          path: "users",
          lazy: async () => {
            const { Users } = await import(
              "./pages/Dashboard/Pages/User/Users"
            );
            return { Component: Users };
          },
        },
      ],
    },
    {
      path: "*",
      lazy: async () => {
        const { NotFoundRoute } = await import("./pages/NotFound/Not-Found");
        return { Component: NotFoundRoute };
      },
    },
  ]);

function App() {
  const router = useMemo(() => createAppRouter(), []);

  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}

export default App;
