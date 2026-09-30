import { useState } from "react";
import { FallbackProps } from "react-error-boundary";
import { Bug, Check, ChevronDown, Copy, Home, RefreshCcw } from "lucide-react";
import { ErrorAction, ErrorBadge, ErrorScreen } from "../Error-Screen";

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

  // Rendered by the app's top-level ErrorBoundary too, outside the router: plain buttons and
  // window.location, never <Link>.
  return (
    <ErrorScreen
      role="alert"
      hero={<ErrorBadge icon={Bug} />}
      title="Something went wrong"
      message="We're sorry — something unexpected happened on our side. Reloading usually fixes it."
      actions={
        <>
          <ErrorAction
            onClick={() => {
              resetErrorBoundary();
              window.location.reload();
            }}
          >
            <RefreshCcw className="h-4 w-4 sm:h-5 sm:w-5" />
            Refresh page
          </ErrorAction>
          <ErrorAction secondary onClick={() => (window.location.href = "/")}>
            <Home className="h-4 w-4 sm:h-5 sm:w-5" />
            Go home
          </ErrorAction>
        </>
      }
    >
      {showDetailsAffordance && (
        <div className="text-left">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            aria-expanded={showDetails}
            className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground sm:text-sm"
          >
            <span>{showDetails ? "Hide" : "Show"} error details</span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${showDetails ? "rotate-180" : ""}`}
            />
          </button>

          {showDetails && (
            <div className="mt-1 space-y-2">
              <div className="rounded-md bg-red-50 p-2.5 dark:bg-red-950">
                <p className="break-words font-mono text-xs leading-relaxed text-red-800 dark:text-red-200">
                  {message}
                </p>
              </div>

              {trimmedStack && (
                <pre className="overflow-x-auto rounded-md bg-red-50 p-2.5 font-mono text-[11px] leading-relaxed text-red-800 dark:bg-red-950 dark:text-red-200">
                  {trimmedStack}
                </pre>
              )}

              {/* Selecting text is painful on a phone, and this is exactly the text you want
                  to send yourself when the crash only reproduces on mobile. */}
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-md px-1 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
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
    </ErrorScreen>
  );
};
