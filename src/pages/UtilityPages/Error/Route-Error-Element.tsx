import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { RefreshCcw, Sparkles } from "lucide-react";
import { NotFoundRoute } from "../NotFound/Not-Found";
import { MainErrorFallback } from "./Main-Error-Boundary";
import { ErrorAction, ErrorBadge, ErrorScreen } from "../Error-Screen";

/**
 * The app-wide route error element.
 *
 * Mounted once on the pathless root route in Router.tsx, so **every** route inherits it.
 * That's the point: without an `errorElement` somewhere up the tree, React Router falls
 * back to its own built-in page — a bare "Unexpected Application Error!" with a raw
 * stack trace, which is not something a user should ever see. Attaching one per route
 * only works until the next route is added without it.
 *
 * Routes that want tailored copy still override it (see `DashboardErrorElement`, which
 * disguises the admin area's 404s); this is the floor, not a ceiling.
 */

/**
 * A stale-chunk failure: the user has an old tab open, we deployed, and the hashed
 * bundle their app is asking for (`index-Cg33J66Z.js`) no longer exists. Very common in
 * the minutes after a release, and completely fixed by reloading — so it gets its own
 * message rather than a generic "something went wrong" the user can't act on.
 */
const isChunkLoadError = (error: unknown): boolean => {
  const message =
    error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(
    message,
  );
};

// Good news rather than a failure, so a sparkle rather than a warning.
const StaleVersionNotice = () => (
  <ErrorScreen
    role="alert"
    hero={<ErrorBadge icon={Sparkles} />}
    title="A new version is available"
    message="The app was updated while this tab was open. Reload to get the latest version — your progress is saved."
    actions={
      <ErrorAction onClick={() => window.location.reload()}>
        <RefreshCcw className="h-4 w-4 sm:h-5 sm:w-5" />
        Reload
      </ErrorAction>
    }
  />
);

export const RouteErrorElement = () => {
  const error = useRouteError();

  if (isChunkLoadError(error)) return <StaleVersionNotice />;

  // A thrown Response (loader `throw new Response(...)`) or an unmatched URL.
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundRoute />;

  // Everything else: the friendly "Something went wrong" screen. It already hides the
  // stack outside development and offers Refresh / Go Home.
  return (
    <MainErrorFallback
      error={error as Error}
      resetErrorBoundary={() => window.location.reload()}
    />
  );
};
