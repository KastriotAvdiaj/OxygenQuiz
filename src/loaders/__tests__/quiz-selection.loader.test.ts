import { describe, expect, it, vi } from "vitest";
import { QueryClient, hashKey, type QueryKey } from "@tanstack/react-query";
import { quizSelectionLoader } from "../quiz-selection.loader";
import { catalogueQueryOptions } from "@/pages/Quiz/catalogue-query";
import { DEFAULT_SORT } from "@/pages/Quiz/components/quiz-sort";

// The chunks are real dynamic imports; the loader's job with them is only to start them.
vi.mock("@/routes/route-chunks", () => ({
  loadHomeLayout: vi.fn(),
  loadQuizSelection: vi.fn(),
  preloadChunks: vi.fn(() => Promise.resolve([])),
}));

const runLoader = async () => {
  const queryClient = new QueryClient();
  const prefetch = vi.spyOn(queryClient, "prefetchQuery").mockResolvedValue(undefined);
  const loader = quizSelectionLoader(queryClient);
  await loader({ request: new Request("http://localhost/choose-quiz"), params: {}, context: {} });
  return prefetch.mock.calls.map(([options]) => hashKey(options.queryKey as QueryKey));
};

describe("quizSelectionLoader", () => {
  // The bug this guards: the loader warmed /quiz/public while the page read /quiz/search, so
  // navigation waited on a request nobody used and the page then fetched cold.
  it("warms the exact catalogue key the page reads on its first render", async () => {
    // The page's first render, spelled out: page 1, no search, default sort, no facets, Picked.
    const pageFirstRender = catalogueQueryOptions({
      page: 1,
      search: "",
      sortBy: DEFAULT_SORT,
      filters: [],
      catalogue: "picked",
    });

    expect(await runLoader()).toContain(hashKey(pageFirstRender.queryKey));
  });

  it("warms the three filter lookups the sidebar needs", async () => {
    const keys = await runLoader();

    expect(keys).toEqual(
      expect.arrayContaining([
        hashKey(["questionCategories"]),
        hashKey(["getQuestionDifficulties"]),
        hashKey(["getQuestionLanguages"]),
      ]),
    );
  });
});
