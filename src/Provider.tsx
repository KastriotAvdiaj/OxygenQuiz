import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "./components/ui/theme-provider";
import { LoadingWave } from "./components/ui/loading-wave";
import { MainErrorFallback } from "./pages/UtilityPages/Error/Main";
import { AuthLoader } from "./lib/Auth";
import { queryConfig } from "./lib/React-query";
import { Notifications } from "./common/Notifications";
import { SettingsApplier } from "./common/SettingsApplier";
import { MultiplayerProvider } from "./context/multiplayer-context";

type AppProviderProps = {
  children: React.ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: queryConfig,
      })
  );

  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <LoadingWave size="xl" />
        </div>
      }
    >
      <ErrorBoundary FallbackComponent={MainErrorFallback}>
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            <ReactQueryDevtools initialIsOpen={false} />
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
              <Notifications />
              <AuthLoader
                renderLoading={() => (
                  <div className="flex h-screen w-screen items-center justify-center bg-background">
                    <LoadingWave size="xl" />
                  </div>
                )}
              >
                <SettingsApplier />
                <MultiplayerProvider>
                  {children}
                </MultiplayerProvider>
              </AuthLoader>
            </ThemeProvider>
          </QueryClientProvider>
        </HelmetProvider>
      </ErrorBoundary>
    </React.Suspense>
  );
};
