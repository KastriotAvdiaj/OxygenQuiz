// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { MainErrorFallback } from "./pages/Error/Main";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={MainErrorFallback}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
