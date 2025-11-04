import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FallbackProps } from "react-error-boundary";
import { AlertCircle, Home, RefreshCcw } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";

// const isDevelopment = import.meta.env.DEV;
const isDevelopment = false;

export const MainErrorFallback: React.FC<FallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  // Log error to monitoring service in production
  if (!isDevelopment) {
    // TODO: Send to your error monitoring service (Sentry, LogRocket, etc.)
    console.error("Error caught by boundary:", error);
  }

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-background p-4 "
      role="alert">
      <Card className="w-full max-w-md text-center border shadow-lg bg-background dark:border-muted dark:bg-primary/10">
        <CardHeader>
          <div className="mx-auto flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <AlertCircle className="h-10 w-10 text-red-500 dark:text-red-400" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We're sorry, but something unexpected happened. Our team has been
            notified and is working on a fix.
          </p>

          {isDevelopment && error && (
            <div className="mt-4 space-y-2 text-left">
              <p className="text-xs font-semibold text-red-600">
                Development Info:
              </p>
              {error?.message && (
                <div className="rounded-md bg-red-50 p-3 dark:bg-red-950">
                  <p className="break-words font-mono text-xs text-red-800 dark:text-red-200">
                    {error.message}
                  </p>
                </div>
              )}
              {error?.stack && (
                <pre className="overflow-x-auto rounded-md bg-red-50 p-3 font-mono text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
                  {error.stack.split("\n").slice(0, 3).join("\n")}
                </pre>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4 pt-4 w-fit mx-auto">
            <LiftedButton
              onClick={() => {
                resetErrorBoundary();
                window.location.reload();
              }}
              className="w-full">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh Page
            </LiftedButton>
            <LiftedButton
              onClick={() => (window.location.href = "/")}
              className="w-full text-foreground bg-muted"
              // backgroundColorForBorder="bg-background text-foreground"
            >
              <Home className="mr-2 h-4 w-4" /> Go Home
            </LiftedButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
