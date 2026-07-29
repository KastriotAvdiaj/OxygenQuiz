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

const StaleVersionNotice = () => (
  <div
    className={`${getErrorFontClass()} app-shell-viewport flex w-full items-center justify-center bg-background p-4`}
    role="alert"
  >
    <Card className="w-full max-w-md border bg-background text-center shadow-lg dark:border-muted dark:bg-primary/10">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">A new version is available</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          The app was updated while this tab was open. Reload to get the latest version —
          your progress is saved.
        </p>
        <div className="mx-auto w-fit pt-2">
          <LiftedButton onClick={() => window.location.reload()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
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
