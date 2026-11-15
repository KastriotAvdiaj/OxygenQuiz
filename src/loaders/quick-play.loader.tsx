import { QueryClient } from "@tanstack/react-query";
import { LoaderFunction } from "react-router-dom";

import { getQuestionCategoriesQueryOptions } from "../pages/Dashboard/Pages/Question/Entities/Categories/api/get-question-categories";
import { getQuestionDifficultyQueryOptions } from "../pages/Dashboard/Pages/Question/Entities/Difficulty/api/get-question-difficulties";
import { getQuestionLanguageQueryOptions } from "../pages/Dashboard/Pages/Question/Entities/Language/api/get-question-language";
import { quickPlayOptionsQueryOptions } from "../pages/Quiz/QuickPlay/quick-play-api";
import { readLanguageChoice, startingLanguages } from "../pages/Quiz/components/quiz-filters";
import { loadHomeLayout, loadQuickPlay, preloadChunks } from "@/routes/route-chunks";

/**
 * Everything `/quick-play` needs for its first paint, in parallel: the three lookups, what can
 * be handed out (the same key the page reads — `quickPlayOptionsQueryOptions`, for the starting
 * languages once the language lookup is in), and the layout and page chunks.
 *
 * `prefetchQuery`, never `ensureQueryData`: a failed fetch stays the page's to render
 * (docs/development/loading-states.md §6).
 */
export const quickPlayLoader =
  (queryClient: QueryClient): LoaderFunction =>
  async () => {
    const options = queryClient.prefetchQuery(getQuestionLanguageQueryOptions()).then(() => {
      const languages = queryClient.getQueryData(getQuestionLanguageQueryOptions().queryKey) ?? [];
      return queryClient.prefetchQuery(
        quickPlayOptionsQueryOptions(startingLanguages(languages, readLanguageChoice()).ids),
      );
    });

    await Promise.all([
      options,
      queryClient.prefetchQuery(getQuestionCategoriesQueryOptions()),
      queryClient.prefetchQuery(getQuestionDifficultyQueryOptions()),
      preloadChunks(loadHomeLayout, loadQuickPlay),
    ]);
    return null;
  };
