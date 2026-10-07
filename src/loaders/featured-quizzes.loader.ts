import { QueryClient } from "@tanstack/react-query";
import { LoaderFunction, redirect } from "react-router-dom";
import { getFeaturedQuizzesQueryOptions } from "@/pages/Quiz/Featured/api/get-featured-quizzes";

/**
 * Query parameters that only mean something to the full catalogue: `?category=` filters it
 * (category-param.ts) and `?shared=` opens a share link's quiz in it. A link carrying one — sent
 * before the catalogue moved to `/choose-quiz/all` — is passed straight through.
 */
export const CATALOGUE_ONLY_PARAMS = ["category", "shared"] as const;

/** Where a `/choose-quiz` URL should go instead, or null to show the featured page. */
export function catalogueRedirectFor(url: URL): string | null {
  return CATALOGUE_ONLY_PARAMS.some((p) => url.searchParams.has(p)) ? `/choose-quiz/all${url.search}` : null;
}

/**
 * `/choose-quiz` — the featured page (docs/quiz/featured-quizzes.md). Starts the featured quizzes
 * loading without waiting for them: the page draws its panels with placeholder tiles meanwhile,
 * and a failed request shows a message there rather than an error page.
 */
export const featuredQuizzesLoader =
  (queryClient: QueryClient): LoaderFunction =>
  ({ request }) => {
    const target = catalogueRedirectFor(new URL(request.url));
    if (target) return redirect(target);
    void queryClient.prefetchQuery(getFeaturedQuizzesQueryOptions());
    return null;
  };
