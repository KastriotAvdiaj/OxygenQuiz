import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "./components/ui/theme-provider";
import { PageLoading } from "./components/ui/page-loading";
import { MainErrorFallback } from "./pages/UtilityPages/Error/Main-Error-Boundary";
import { AuthLoader } from "./lib/Auth";
import { queryConfig } from "./lib/React-query";
import { Notifications } from "./common/Notifications";
import { SettingsApplier } from "./common/SettingsApplier";
import { MultiplayerProvider } from "./context/multiplayer-context";
import { AudioProvider } from "./lib/audio";

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
    // The outermost boundary, ABOVE RouterProvider — so anything it catches blanks the
    // whole app, header included. That is right for the very first paint and wrong for a
    // navigation, which is why the layout has a boundary of its own (layouts/layout.tsx):
    // by the time a route chunk loads, this one should already be resolved.
    <React.Suspense fallback={<PageLoading fullScreen label="Starting OxygenQuiz" />}>
      <ErrorBoundary FallbackComponent={MainErrorFallback}>
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            <ReactQueryDevtools initialIsOpen={false} />
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
              <Notifications />
              <AuthLoader
                renderLoading={() => (
                  <PageLoading fullScreen label="Signing you in" />
                )}
              >
                <SettingsApplier />
                <AudioProvider>
                  <MultiplayerProvider>
                    {children}
                  </MultiplayerProvider>
                </AudioProvider>
              </AuthLoader>
            </ThemeProvider>
          </QueryClientProvider>
        </HelmetProvider>
      </ErrorBoundary>
    </React.Suspense>
  );
};
