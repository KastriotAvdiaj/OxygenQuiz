import type { QueryClient } from "@tanstack/react-query";
import type { User } from "@/types/user-types";
import { QuestionType } from "@/types/question-types";
import { getQuestionCategoriesQueryOptions } from "@/pages/Dashboard/Pages/Question/Entities/Categories/api/get-question-categories";
import { getQuestionDifficultyQueryOptions } from "@/pages/Dashboard/Pages/Question/Entities/Difficulty/api/get-question-difficulties";
import { getQuestionLanguageQueryOptions } from "@/pages/Dashboard/Pages/Question/Entities/Language/api/get-question-language";
import { getUsersQueryOptions } from "@/pages/Dashboard/Pages/User/api/get-users";
import { typedQuestionSearchQueryOptions } from "@/pages/Dashboard/Pages/Question/api/search-questions-typed";
import {
  initialQuestionQueryParams,
  toFilterQuery,
} from "@/pages/Dashboard/Pages/Question/api/question-filter-query";
import { searchQuizzesQueryOptions } from "@/pages/Dashboard/Pages/Quiz/api/search-quizzes";
import {
  buildAdminQuizzesQuery,
  initialAdminQuizzesFilterState,
} from "@/pages/Dashboard/Pages/Quiz/api/admin-quizzes-query";

/**
 * Starting the admin dashboard's list pages early — their code and their first screen of data —
 * from two places that both use these functions:
 *
 * 1. **The route loaders** (`Router.tsx`), so the data downloads alongside the page's chunk
 *    instead of after it.
 * 2. **Hovering or focusing a link to the page** (the drawer's Admin Dashboard link, the
 *    dashboard's own nav), which buys the time between pointing at a link and clicking it —
 *    usually a few hundred milliseconds, often the whole wait.
 *
 * Fire-and-forget: nothing here is awaited. A loader that awaited would hold the old page on
 * screen until the data arrived; these pages draw their own skeletons now, so it is better to
 * show the page at once and let the data land in it (ADR 0029). A prefetch that loses the race
 * costs nothing — the page's `useQuery` joins the request already in flight.
 *
 * <b>Admins only, checked here.</b> Child route loaders run in parallel with the dashboard's
 * `adminAuthLoader`, not after it, and every failed request toasts (`Api-client.ts`). Without
 * this check a non-admin opening `/dashboard/questions` would see a 403 toast for a request they
 * never made. If the user isn't in the cache yet (a cold load), nothing is prefetched and the
 * page fetches for itself — the old behaviour.
 *
 * See docs/development/loading-states.md §6–§7.
 */

const isAdmin = (queryClient: QueryClient) => {
  const user = queryClient.getQueryData<User | null>(["authenticated-user"]);
  return user?.roles?.some((r) => r === "Admin" || r === "SuperAdmin") ?? false;
};

/** The chunk importers — shared with the route definitions so both warm the same module. */
export const loadQuestionsPage = () => import("@/pages/Dashboard/Pages/Question/Questions");
export const loadQuizzesPage = () => import("@/pages/Dashboard/Pages/Quiz/Quizzes");

const prefetchLookups = (queryClient: QueryClient) => [
  queryClient.prefetchQuery(getQuestionCategoriesQueryOptions()),
  queryClient.prefetchQuery(getQuestionDifficultyQueryOptions()),
  queryClient.prefetchQuery(getQuestionLanguageQueryOptions()),
];

/** The Questions page's first screen: the filter lookups and page 1 of the default tab. */
export const prefetchQuestionsPageData = (queryClient: QueryClient) => {
  if (!isAdmin(queryClient)) return;
  void Promise.all([
    ...prefetchLookups(queryClient),
    queryClient.prefetchQuery(
      typedQuestionSearchQueryOptions(
        QuestionType.MultipleChoice,
        "all",
        toFilterQuery(initialQuestionQueryParams),
      ),
    ),
  ]);
};

/** The Quizzes page's first screen: the filter lookups, the author list and page 1. */
export const prefetchQuizzesPageData = (queryClient: QueryClient) => {
  if (!isAdmin(queryClient)) return;
  void Promise.all([
    ...prefetchLookups(queryClient),
    queryClient.prefetchQuery(getUsersQueryOptions()),
    queryClient.prefetchQuery(
      searchQuizzesQueryOptions("all", buildAdminQuizzesQuery(initialAdminQuizzesFilterState)),
    ),
  ]);
};

const PAGES: Record<string, { load: () => Promise<unknown>; data: (qc: QueryClient) => void }> = {
  "/dashboard/questions": { load: loadQuestionsPage, data: prefetchQuestionsPageData },
  "/dashboard/quizzes": { load: loadQuizzesPage, data: prefetchQuizzesPageData },
};

/**
 * Warm a dashboard page's chunk and data on hover / focus. Paths with nothing to warm are a
 * no-op, so callers can pass any nav target. `/dashboard` itself redirects to Questions.
 */
export const prefetchDashboardPage = (path: string, queryClient: QueryClient) => {
  const page = PAGES[path === "/dashboard" ? "/dashboard/questions" : path];
  if (!page || !isAdmin(queryClient)) return;
  // A failed chunk download here is not an error worth surfacing: the click will retry it.
  page.load().catch(() => {});
  page.data(queryClient);
};

/** Route loader: start the page's data next to its chunk, and don't wait for it. */
export const dashboardListLoader =
  (queryClient: QueryClient, prefetch: (qc: QueryClient) => void) => () => {
    prefetch(queryClient);
    return null;
  };
