import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FallbackProps } from "react-error-boundary";
import { Check, ChevronDown, Copy, Home, RefreshCcw } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";
import { getErrorFontClass } from "../errorFontZone";

const isDevelopment = import.meta.env.DEV;

/**
 * Whether to expose the underlying error on screen.
 *
 * Normal users never see it — an error message is noise at best and a leak at worst. But the
 * console is unreachable on a phone, and on iOS the only official way in is Safari Web Inspector,
 * which needs a Mac. So it stays reachable in development, or on demand anywhere via `?debug=1`.
 * That opt-in is the whole reason a mobile-only crash is diagnosable at all — don't remove it
 * without putting real error reporting (Sentry et al.) in first.
 */
const detailsRequested = (): boolean => {
  if (isDevelopment) return true;
  try {
    return new URLSearchParams(window.location.search).has("debug");
  } catch {
    return false;
  }
};

/**
 * Route errors are `unknown` — a thrown Error, a Response, a string, or anything else a loader
 * decided to throw. Normalise to something printable rather than rendering "[object Object]".
 */
const describeError = (error: unknown): { message: string; stack?: string } => {
  if (error instanceof Error)
    return { message: error.message, stack: error.stack };
  if (typeof error === "string") return { message: error };

  if (error && typeof error === "object") {
    const candidate = error as {
      status?: unknown;
      statusText?: unknown;
      message?: unknown;
    };
    const summary = [
      candidate.status,
      candidate.statusText ?? candidate.message,
    ]
      .filter((part) => part !== undefined && part !== null && part !== "")
      .join(" ");
    if (summary) return { message: summary };

    try {
      return { message: JSON.stringify(error) };
    } catch {
      // Circular or otherwise unserialisable — fall through to String().
    }
  }

  return { message: String(error ?? "Unknown error") };
};

export const MainErrorFallback: React.FC<FallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  const showDetailsAffordance = detailsRequested();
  const [showDetails, setShowDetails] = useState(isDevelopment);
  const [copied, setCopied] = useState(false);

  const { message, stack } = describeError(error);
  // First few frames only — the rest is framework noise, and this has to fit on a phone.
  const trimmedStack = stack?.split("\n").slice(0, 5).join("\n");
  const copyPayload = [message, trimmedStack, window.location.href]
    .filter(Boolean)
    .join("\n\n");

  if (!isDevelopment) {
    // TODO: Send to your error monitoring service (Sentry, LogRocket, etc.)
    console.error("Error caught by boundary:", error);
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is unavailable on insecure origins and in some mobile browsers. The text is
      // already on screen and selectable, so there's nothing useful to say here.
    }
  };

  return (
    <div
      className={`${getErrorFontClass()} app-shell-viewport flex w-full items-center justify-center bg-background p-6 sm:p-8`}
      role="alert"
    >
      {/* max-w-xs on phones: the card should read as a card, not a full-bleed page. The step up
          to max-w-md only once there's room for it keeps the measure comfortable at both ends. */}
      <Card className="w-full max-w-xs sm:max-w-md text-center border shadow-lg bg-background dark:border-muted dark:bg-primary/10">
        <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-4">
          <CardTitle className="mt-3 text-lg font-bold leading-tight sm:mt-4 sm:text-2xl">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-6 sm:pt-0">
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            We're sorry — something unexpected happened. Reloading usually
            helps.
          </p>

          {showDetailsAffordance && (
            <div className="text-left">
              <button
                type="button"
                onClick={() => setShowDetails((prev) => !prev)}
                aria-expanded={showDetails}
                className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground sm:text-xs"
              >
                <span>{showDetails ? "Hide" : "Show"} error details</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${showDetails ? "rotate-180" : ""}`}
                />
              </button>

              {showDetails && (
                <div className="mt-1 space-y-2">
                  <div className="rounded-md bg-red-50 p-2.5 dark:bg-red-950">
                    <p className="break-words font-mono text-[11px] leading-relaxed text-red-800 dark:text-red-200">
                      {message}
                    </p>
                  </div>

                  {trimmedStack && (
                    <pre className="overflow-x-auto rounded-md bg-red-50 p-2.5 font-mono text-[10px] leading-relaxed text-red-800 dark:bg-red-950 dark:text-red-200">
                      {trimmedStack}
                    </pre>
                  )}

                  {/* Selecting text is painful on a phone, and this is exactly the text you want
                      to send yourself when the crash only reproduces on mobile. */}
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-md px-1 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy details
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mx-auto flex w-full flex-col gap-2 pt-1 sm:gap-3 sm:pt-2">
            <LiftedButton
              onClick={() => {
                resetErrorBoundary();
                window.location.reload();
              }}
              className="w-full text-sm sm:text-base"
            >
              <RefreshCcw className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Refresh Page
            </LiftedButton>
            <LiftedButton
              onClick={() => (window.location.href = "/")}
              className="w-full bg-muted text-sm text-foreground sm:text-base"
              liftColor="hsl(var(--muted-foreground))"
            >
              <Home className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Go Home
            </LiftedButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
