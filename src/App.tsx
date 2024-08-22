import { lazy, Suspense } from "react";
import { AppProvider } from "./Provider";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Header from "./componentsOurs/Header";
import "./global.css";
// Lazy load components
// Lazy load components
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
// Apply the same pattern for other lazy-loaded components
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


const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <>
        <Header />
        <Suspense fallback={<div>Loading...</div>}>
          <Home />
        </Suspense>
      </>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <Suspense fallback={<div>Loading...</div>}>
        <Dashboard />
      </Suspense>
    ),
  },
  {
    path: "/about-us",
    element: (
      <>
        <Header />
        <Suspense fallback={<div>Loading...</div>}>
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
        <Suspense fallback={<div>Loading...</div>}>
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
        <Suspense fallback={<div>Loading...</div>}>
          <MyProfile />
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