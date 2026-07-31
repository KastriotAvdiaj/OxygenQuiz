import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCcw } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";
import { NotFoundRoute } from "../NotFound/Not-Found";
import { MainErrorFallback } from "./Main-Error-Boundary";
import { getErrorFontClass } from "../errorFontZone";

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

// Sizing mirrors MainErrorFallback so the two error screens feel like one family on a phone:
// a compact card with room around it, not a full-bleed page. See that file for the reasoning.
const StaleVersionNotice = () => (
  <div
    className={`${getErrorFontClass()} app-shell-viewport flex w-full items-center justify-center bg-background p-6 sm:p-8`}
    role="alert"
  >
    <Card className="w-full max-w-xs border bg-background text-center shadow-lg sm:max-w-md dark:border-muted dark:bg-primary/10">
      <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-4">
        <CardTitle className="text-lg font-bold leading-tight sm:text-2xl">
          A new version is available
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-6 sm:pt-0">
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          The app was updated while this tab was open. Reload to get the latest version —
          your progress is saved.
        </p>
        <div className="mx-auto w-fit pt-1 sm:pt-2">
          <LiftedButton onClick={() => window.location.reload()} className="text-sm sm:text-base">
            <RefreshCcw className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Reload
          </LiftedButton>
        </div>
      </CardContent>
    </Card>
  </div>
);

export const RouteErrorElement = () => {
  const error = useRouteError();

  if (isChunkLoadError(error)) return <StaleVersionNotice />;

  // A thrown Response (loader `throw new Response(...)`) or an unmatched URL.
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundRoute />;

  // Everything else: the friendly "Something went wrong" card. It already hides the
  // stack outside development and offers Refresh / Go Home.
  return (
    <MainErrorFallback
      error={error as Error}
      resetErrorBoundary={() => window.location.reload()}
    />
  );
};
