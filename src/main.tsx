// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppProvider } from "./Provider";
import { MainErrorFallback } from "./pages/Error/Main";
import { ErrorBoundary } from "react-error-boundary";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary FallbackComponent={MainErrorFallback}>
    <AppProvider>
      <App />
    </AppProvider>
  </ErrorBoundary>
);
