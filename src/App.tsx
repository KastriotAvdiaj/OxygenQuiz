import "./global.css";
import { Route, BrowserRouter, Routes, useLocation } from "react-router-dom";
import { Home } from "./pages/Home/Home";
import Header from "./componentsOurs/Header";
import { Dashboard } from "./pages/Dashboard/Dashboard";
import { AboutUs } from "./pages/AboutUs/AboutUs";
import { Settings } from "./pages/SettingsPage/Settings";
import { ThemeProvider } from "./components/ui/theme-provider";
import { MyProfile } from "./pages/Profile/MyProfile";

function AppContent() {
  const location = useLocation();

  return (
    <>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        {location.pathname !== "/dashboard" && <Header />}
        <main className="">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/my-profile" element={<MyProfile />} />
          </Routes>
        </main>
      </ThemeProvider>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
