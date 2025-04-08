import { Button } from "@/components/ui/button";
import { FallbackProps } from "react-error-boundary";

export const MainErrorFallback: React.FC<FallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-background p-4"
      role="alert"
    >
      <div className="flex w-full max-w-screen-md flex-col items-center text-red-500">
        <h2 className="text-lg font-semibold">Oops, something went wrong</h2>

        {/* Scrollable error container */}
        <div className="mt-4 w-full overflow-x-auto">
          <div className="min-w-[300px] space-y-2">
            <p className="break-words rounded-md bg-red-500/10 p-3 font-mono text-sm">
              {error.message}
            </p>
            {error.stack && (
              <pre className="overflow-x-auto rounded-md bg-red-500/10 p-3 font-mono text-xs">
                {error.stack.split("\n").slice(0, 2).join("\n")}
              </pre>
            )}
          </div>
        </div>

        <Button
          className="mt-4"
          onClick={() => {
            resetErrorBoundary();
            window.location.reload();
          }}
        >
          Refresh
        </Button>
      </div>
    </div>
  );
};
