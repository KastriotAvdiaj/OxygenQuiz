import { lazy, Suspense, useMemo } from "react";
import { AppProvider } from "./Provider";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Header from "./common/Header";
import { ProtectedRoute } from "./lib/Auth";
import { AppRoot } from "./pages/AppRoot";
import { QueryClient, useQueryClient } from '@tanstack/react-query';


import { RedirectIfLoggedIn } from "./lib/Redirect";
import "./global.css";
import { Spinner } from "./components/ui/Spinnter";
import { Navigate ,LoaderFunctionArgs} from "react-router-dom";

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
const createAppRouter = (queryClient: QueryClient) =>
  createBrowserRouter([
    {
      path: "/",
      element: (
        <>
          <Header />
          <Home />
        </>
      ),
    },
    {
      path: "/about-us",
      element: (
        <>
          <Header />
          <AboutUs />
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
          path: 'users',
          lazy: async () => {
            const { Users } = await import('./pages/Dashboard/Pages/User/Users');
            return { Component: Users };
          },
          loader: async (args: LoaderFunctionArgs) => {
            const { usersLoader } = await import('./pages/Dashboard/Pages/User/Users');
            return usersLoader(queryClient)(args);
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
  const queryClient = useQueryClient();

  const router = useMemo(() => createAppRouter(queryClient), [queryClient]);


  return (
    <AppProvider>
      <Suspense
        fallback={
          <div className="flex h-screen w-screen items-center justify-center">
            <Spinner size="xl" />
          </div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
    </AppProvider>
  );
}

export default App;
