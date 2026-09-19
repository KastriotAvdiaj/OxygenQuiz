import { QueryClient } from "@tanstack/react-query";
import { LoaderFunction, LoaderFunctionArgs } from "react-router-dom";
import { userAuthLoader } from "@/lib/Auth";
import { sessionResultsQueryOptions } from "@/pages/Quiz/Sessions/api/get-quiz-session";
import { guestSessionResultsQueryOptions } from "@/pages/Quiz/Sessions/api/guest-quiz-session";

/**
 * Warm the finished session before the results route renders.
 *
 * Finishing a quiz used to show two loading screens back to back, for two different reasons:
 * the results route is a lazy chunk (one wait), and its component then called
 * `useGetSessionResults` from cold (a second wait, starting only once the first had finished
 * and the component had mounted). Two sequential waits, each announcing itself.
 *
 * Starting the request here collapses them. React Router runs this before the route renders,
 * so the fetch overlaps the chunk download instead of queueing behind it, and by the time the
 * component mounts `useQuery` reads the same cache entry and is never `isLoading` at all.
 *
 * ## Why prefetchQuery and not ensureQueryData
 *
 * `prefetchQuery` resolves whether the request succeeds or fails; `ensureQueryData` rejects,
 * which here would mean a failed results fetch throwing out of the loader into the route's
 * `errorElement` and never reaching the wrapper's own "Unable to Load Results" screen with
 * its Try Again button. The loader's job is to start the request early, not to take over
 * deciding what a failure looks like — so it swallows the outcome and lets the component read
 * it from the cache exactly as it did before. A results page that fails still fails the way
 * it always has.
 */
export const quizResultsLoader =
  (queryClient: QueryClient): LoaderFunction =>
  async (args: LoaderFunctionArgs) => {
    // Auth first, and bail on its answer: a Response is a redirect to /login or a 404, and
    // fetching someone's results on the way to bouncing them is wasted work at best.
    const auth = await userAuthLoader(queryClient)(args);
    if (auth instanceof Response) return auth;

    const { sessionId } = args.params;
    if (sessionId) {
      await queryClient.prefetchQuery(sessionResultsQueryOptions(sessionId));
    }

    return auth;
  };

/**
 * The same warm-up for guest results, minus the auth gate — the guest results route is public
 * on purpose (docs/auth/guest-play.md).
 *
 * Note this only prefetches the GET. Viewing the page is still what *spends* the guest's free
 * attempt, and that is the /finish call the component makes once results are on screen; a
 * loader must stay safe to re-run, so the side effect stays where it is.
 */
export const guestQuizResultsLoader =
  (queryClient: QueryClient): LoaderFunction =>
  async ({ params }: LoaderFunctionArgs) => {
    const { sessionId } = params;
    if (sessionId) {
      await queryClient.prefetchQuery(
        guestSessionResultsQueryOptions(sessionId),
      );
    }
    return null;
  };
