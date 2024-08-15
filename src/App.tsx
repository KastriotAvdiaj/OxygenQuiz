import "./global.css";
import { Route, BrowserRouter, Routes, useLocation } from "react-router-dom";
import { Home } from "./pages/Home/Home";
import Header from "./componentsOurs/Header";
import { Dashboard } from "./pages/Dashboard/Dashboard";
import { AboutUs } from "./pages/AboutUs/AboutUs";

function AppContent() {
  const location = useLocation();

  return (
    <>
      {location.pathname !== "/dashboard" && <Header />}
      <main className="">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/about-us" element={<AboutUs />} />
        </Routes>
      </main>
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
