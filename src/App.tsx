import { lazy, Suspense, useMemo } from "react";
import { AppProvider } from "./Provider";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import Header from "./common/Header";
import "./global.css";
import { Spinner } from "./components/ui/Spinnter";

const Home = lazy(() =>
  import("./pages/Home/Home").then((module) => ({ default: module.Home }))
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard/Dashboard").then((module) => ({
    default: module.Dashboard,
  }))
);
const AboutUs = lazy(() =>
  import("./pages/AboutUs/AboutUs").then((module) => ({
    default: module.AboutUs,
  }))
);
const Settings = lazy(() =>
  import("./pages/SettingsPage/Settings").then((module) => ({
    default: module.Settings,
  }))
);
const MyProfile = lazy(() =>
  import("./pages/Profile/MyProfile").then((module) => ({
    default: module.MyProfile,
  }))
);
const Login = lazy(() => import("./pages/Login/Login"));
const Signup = lazy(() => import("./pages/Signup/Signup"));

// Using query client in routes
const createAppRouter = (queryClient: QueryClient) =>
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
      path: "/dashboard/*",
      element: (
        <Suspense
          fallback={
            <div className="flex h-screen w-screen items-center justify-center">
              <Spinner size="xl" />
            </div>
          }
        >
          <Dashboard />
        </Suspense>
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
      path: "/settings",
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
            <Settings />
          </Suspense>
        </>
      ),
    },
    {
      path: "/my-profile",
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
            <MyProfile />
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
      path: "*",
      lazy: async () => {
        const { NotFoundRoute } = await import("./pages/NotFound/Not-Found");
        return { Component: NotFoundRoute };
      },
    },
  ]);

function App() {
  const queryClient = useMemo(() => new QueryClient(), []);
  const router = useMemo(() => createAppRouter(queryClient), [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
