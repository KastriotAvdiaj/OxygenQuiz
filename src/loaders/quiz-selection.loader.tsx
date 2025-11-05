import { QueryClient } from "@tanstack/react-query";
import { LoaderFunction } from "react-router-dom";
import { getAllQuizzesQueryOptions } from "../pages/Dashboard/Pages/Quiz/api/get-all-quizzes";
import { handleLoaderError } from "@/lib/loaderError"; // Make sure to import it

export const quizSelectionLoader =
  (queryClient: QueryClient): LoaderFunction =>
  async () => {
    const initialParams = {};
    const options = getAllQuizzesQueryOptions(initialParams);

    // Wrap the data-fetching logic in the handler.
    // The handler needs a function that returns a promise.
    return handleLoaderError(() => queryClient.ensureQueryData(options));
  };
