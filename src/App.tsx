import { lazy, Suspense } from "react";
import { AppProvider } from "./Provider";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Header from "./componentsOurs/Header";
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

const Signup = lazy(() => import("./pages/Signup/Signup"));

const router = createBrowserRouter([
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
]);

function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}

export default App;
