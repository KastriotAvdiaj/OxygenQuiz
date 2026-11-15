import { describe, expect, it, vi } from "vitest";
import { QueryClient, hashKey, type QueryKey } from "@tanstack/react-query";

import { quickPlayLoader } from "../quick-play.loader";
import { quickPlayOptionsQueryOptions } from "@/pages/Quiz/QuickPlay/quick-play-api";

// The chunks are real dynamic imports; the loader's job with them is only to start them.
vi.mock("@/routes/route-chunks", () => ({
  loadHomeLayout: vi.fn(),
  loadQuickPlay: vi.fn(),
  preloadChunks: vi.fn(() => Promise.resolve([])),
}));

const run = async (queryClient = new QueryClient()) => {
  const prefetch = vi.spyOn(queryClient, "prefetchQuery").mockResolvedValue(undefined);
  await quickPlayLoader(queryClient)({ request: new Request("http://localhost/quick-play"), params: {}, context: {} });
  return prefetch.mock.calls.map(([options]) => hashKey(options.queryKey as QueryKey));
};

describe("quickPlayLoader", () => {
  it("warms the three lookups the tiles are built from", async () => {
    expect(await run()).toEqual(
      expect.arrayContaining([
        hashKey(["questionCategories"]),
        hashKey(["getQuestionDifficulties"]),
        hashKey(["getQuestionLanguages"]),
      ]),
    );
  });

  // The page starts on English, like the catalogue, so the key it reads carries the English id.
  it("warms the options for the languages the page starts on", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["getQuestionLanguages"], [
      { id: 1, language: "Albanian", createdAt: "" },
      { id: 3, language: "English", createdAt: "" },
    ]);

    expect(await run(queryClient)).toContain(hashKey(quickPlayOptionsQueryOptions([3]).queryKey));
  });
});
