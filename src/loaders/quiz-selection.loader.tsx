import { QueryClient } from "@tanstack/react-query";
import { LoaderFunction } from "react-router-dom";
import { getQuestionCategoriesQueryOptions } from "../pages/Dashboard/Pages/Question/Entities/Categories/api/get-question-categories";
import { getQuestionDifficultyQueryOptions } from "../pages/Dashboard/Pages/Question/Entities/Difficulty/api/get-question-difficulties";
import { getQuestionLanguageQueryOptions } from "../pages/Dashboard/Pages/Question/Entities/Language/api/get-question-language";
import {
  INITIAL_CATALOGUE_STATE,
  catalogueQueryOptions,
} from "../pages/Quiz/catalogue-query";
import { loadHomeLayout, loadQuizSelection, preloadChunks } from "@/routes/route-chunks";

/**
 * Everything `/choose-quiz` needs for its first paint, started at once and in parallel: page 1
 * of the catalogue (the same key the page reads — catalogue-query.ts), the three filter lookups,
 * and the layout and page chunks (route-chunks.ts). The page then mounts with all of it cached,
 * so it never shows a loader of its own on arrival. `RouteProgressBar` covers the wait.
 *
 * The categories also matter for correctness: `?category=<name>` is resolved to an id on the
 * page's first render, so they must be cached by then (category-param.ts). With that param the
 * first query has a filter, so the catalogue prefetch misses and the page fetches it itself —
 * the arrival link's one extra wait, accepted to keep the name→id resolution in one place.
 *
 * `prefetchQuery`, never `ensureQueryData`: a failed fetch stays the page's to render, not the
 * route's `errorElement` (docs/development/loading-states.md §6).
 */
export const quizSelectionLoader =
  (queryClient: QueryClient): LoaderFunction =>
  async () => {
    await Promise.all([
      queryClient.prefetchQuery(catalogueQueryOptions(INITIAL_CATALOGUE_STATE)),
      queryClient.prefetchQuery(getQuestionCategoriesQueryOptions()),
      queryClient.prefetchQuery(getQuestionDifficultyQueryOptions()),
      queryClient.prefetchQuery(getQuestionLanguageQueryOptions()),
      preloadChunks(loadHomeLayout, loadQuizSelection),
    ]);
    return null;
  };
