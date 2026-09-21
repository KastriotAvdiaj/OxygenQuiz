import { QueryClient } from "@tanstack/react-query";
import { LoaderFunction } from "react-router-dom";
import { getPublicQuizzesQueryOptions } from "../pages/Dashboard/Pages/Quiz/api/get-public-quizzes";
import { handleLoaderError } from "@/lib/loaderError"; // Make sure to import it
import { getQuestionCategoriesQueryOptions } from "../pages/Dashboard/Pages/Question/Entities/Categories/api/get-question-categories";
import { CATEGORY_PARAM } from "../pages/Quiz/components/quiz-filters/category-param";

export const quizSelectionLoader =
  (queryClient: QueryClient): LoaderFunction =>
  async ({ request }) => {
    // `?category=<name>` is resolved to an id on the page's first render, so the categories
    // must already be cached by then (category-param.ts). Best-effort: if this fails the page
    // still loads and simply ignores the param.
    if (new URL(request.url).searchParams.get(CATEGORY_PARAM)) {
      await queryClient
        .ensureQueryData(getQuestionCategoriesQueryOptions())
        .catch(() => undefined);
    }

    const initialParams = {};
    const options = getPublicQuizzesQueryOptions(initialParams);

    // Wrap the data-fetching logic in the handler.
    // The handler needs a function that returns a promise.
    return handleLoaderError(() => queryClient.ensureQueryData(options));
  };
