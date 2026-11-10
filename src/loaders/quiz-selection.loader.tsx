import { QueryClient } from "@tanstack/react-query";
import { LoaderFunction } from "react-router-dom";
import { getQuestionCategoriesQueryOptions } from "../pages/Dashboard/Pages/Question/Entities/Categories/api/get-question-categories";
import { getQuestionDifficultyQueryOptions } from "../pages/Dashboard/Pages/Question/Entities/Difficulty/api/get-question-difficulties";
import { getQuestionLanguageQueryOptions } from "../pages/Dashboard/Pages/Question/Entities/Language/api/get-question-language";
import {
  INITIAL_CATALOGUE_STATE,
  catalogueQueryOptions,
} from "../pages/Quiz/catalogue-query";
import { readLanguageChoice, startingLanguages } from "../pages/Quiz/components/quiz-filters";
import { rule } from "@/lib/filtering";
import { loadHomeLayout, loadQuizSelection, preloadChunks } from "@/routes/route-chunks";

/**
 * Everything `/choose-quiz` needs for its first paint, started at once and in parallel: page 1
 * of the catalogue (the same key the page reads — catalogue-query.ts, filtered to the starting
 * languages once the language lookup is in), the three filter lookups,
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
    // The catalogue waits for the languages: the page starts on English (default-language.ts),
    // so page 1's key carries the English id, and only the lookup knows it.
    const catalogue = queryClient
      .prefetchQuery(getQuestionLanguageQueryOptions())
      .then(() => {
        const languages =
          queryClient.getQueryData(getQuestionLanguageQueryOptions().queryKey) ?? [];
        const { ids } = startingLanguages(languages, readLanguageChoice());
        return queryClient.prefetchQuery(
          catalogueQueryOptions({
            ...INITIAL_CATALOGUE_STATE,
            filters: ids.length ? [rule.in("languageId", ids)] : [],
          })
        );
      });

    await Promise.all([
      catalogue,
      queryClient.prefetchQuery(getQuestionCategoriesQueryOptions()),
      queryClient.prefetchQuery(getQuestionDifficultyQueryOptions()),
      preloadChunks(loadHomeLayout, loadQuizSelection),
    ]);
    return null;
  };
