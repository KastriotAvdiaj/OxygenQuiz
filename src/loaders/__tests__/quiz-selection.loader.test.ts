import { describe, expect, it, vi } from "vitest";
import { QueryClient, hashKey, type QueryKey } from "@tanstack/react-query";
import { quizSelectionLoader } from "../quiz-selection.loader";
import { catalogueQueryOptions } from "@/pages/Quiz/catalogue-query";
import { DEFAULT_SORT } from "@/pages/Quiz/components/quiz-sort";
import { rule } from "@/lib/filtering";

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

  // The page starts on English (default-language.ts), so once the language lookup is in, page 1's
  // key carries the English id — warming the unfiltered key would miss again.
  it("warms page 1 filtered to English once the languages are known", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["getQuestionLanguages"], [
      { id: 1, language: "Albanian", createdAt: "" },
      { id: 3, language: "English", createdAt: "" },
    ]);
    const prefetch = vi.spyOn(queryClient, "prefetchQuery").mockResolvedValue(undefined);
    await quizSelectionLoader(queryClient)({
      request: new Request("http://localhost/choose-quiz"),
      params: {},
      context: {},
    });
    const keys = prefetch.mock.calls.map(([options]) => hashKey(options.queryKey as QueryKey));

    const english = catalogueQueryOptions({
      page: 1,
      search: "",
      sortBy: DEFAULT_SORT,
      filters: [rule.in("languageId", [3])],
      catalogue: "picked",
    });
    expect(keys).toContain(hashKey(english.queryKey));
  });
});
