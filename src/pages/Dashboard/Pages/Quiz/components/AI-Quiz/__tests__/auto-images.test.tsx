import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const post = vi.fn();
vi.mock("@/lib/Api-client", () => ({
  api: { post: (...a: unknown[]) => post(...a) },
  apiErrorMessage: () => "x",
}));

import { QuestionType } from "@/types/question-types";
import { queryConfig } from "@/lib/React-query";
import { cleanImageQuery, parseAiOutput, MAX_IMAGE_QUERIES } from "../parse-ai-output";
import { useAutoImages } from "../use-auto-images";
import { parseContext } from "../__fixtures__/ai-quiz.fixtures";

/**
 * "Add images" (docs/media/media-pipeline.md, "AI-added images"): the model may name a picture to
 * search for; the parser keeps only a plain phrase, and our code finds and imports the image.
 */

const tf = (text: string, imageQuery?: unknown) => ({
  type: QuestionType.TrueFalse,
  text,
  difficulty: "Easy",
  correctAnswer: true,
  ...(imageQuery !== undefined ? { imageQuery } : {}),
});

const reply = (questions: unknown[]) => JSON.stringify({ questions });

describe("the model's image search phrase", () => {
  it("is kept as a plain phrase, and dropped when it is a link, a file name or a description", () => {
    expect(cleanImageQuery("  Flag   of Kosovo ")).toBe("Flag of Kosovo");
    expect(cleanImageQuery("https://upload.wikimedia.org/flag.png")).toBeUndefined();
    expect(cleanImageQuery("www.example.com/flag")).toBeUndefined();
    expect(cleanImageQuery("Flag_of_Kosovo.svg")).toBeUndefined();
    expect(cleanImageQuery("a".repeat(81))).toBeUndefined();
    expect(cleanImageQuery(42)).toBeUndefined();
    expect(cleanImageQuery("x")).toBeUndefined();
  });

  it("rides on the parsed question, and no more than ten questions get one", () => {
    const questions = Array.from({ length: 12 }, (_, i) => tf(`Is statement number ${i + 1} true?`, `Subject ${i + 1}`));
    const result = parseAiOutput(reply([...questions, tf("No picture here, is that right?")]), parseContext);

    const withQuery = result.questions.filter((q) => q.imageQuery);
    expect(withQuery).toHaveLength(MAX_IMAGE_QUERIES);
    expect(result.questions[0].imageQuery).toBe("Subject 1");
    expect(result.questions[12].imageQuery).toBeUndefined();
    // Nothing is attached by the parser: a phrase is not an image until our code finds one.
    expect(result.questions[0].question.media).toBeNull();
  });
});

describe("useAutoImages", () => {
  const ASSET = {
    id: "8f7e3c1a-1111-4222-8333-444455556666",
    kind: "Image",
    url: "https://media.test/flag.webp",
    byteSize: 1,
    credit: { provider: "Wikimedia Commons", line: "Jane · CC0 · Wikimedia Commons", sourceUrl: "https://commons.wikimedia.org/wiki/File:F.svg" },
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: queryConfig })}>{children}</QueryClientProvider>
  );

  // Braced: a function returned from beforeEach is run as a cleanup hook.
  beforeEach(() => {
    post.mockReset();
  });

  it("asks our server for each phrase and hands the builder the questions with their pictures", async () => {
    post.mockImplementation((_url: string, body: { query: string }) =>
      body.query === "Flag of Kosovo"
        ? Promise.resolve({ data: ASSET })
        : Promise.reject({ response: { status: 404 } }),
    );
    const result = parseAiOutput(
      reply([tf("Is this the flag of Kosovo?", "Flag of Kosovo"), tf("Is the sky blue on a clear day?"), tf("Is this Atlantis?", "Atlantis")]),
      parseContext,
    );

    const { result: hook } = renderHook(() => useAutoImages(result), { wrapper });

    expect(hook.current.pending).toBe(true);
    await waitFor(() => expect(hook.current.pending).toBe(false));

    expect(post).toHaveBeenCalledTimes(2); // only the questions that asked
    expect(post).toHaveBeenCalledWith("/media/stock/auto", { query: "Flag of Kosovo" }, expect.anything());
    expect(hook.current.questions[0].question.media).toEqual({
      assetId: ASSET.id,
      url: ASSET.url,
      kind: "Image",
      credit: { line: ASSET.credit.line, url: ASSET.credit.sourceUrl },
    });
    expect(hook.current.questions[1].question.media).toBeNull();
    expect(hook.current.notFound).toEqual([3]);
  });

  it("isn't pending when nothing asked for a picture, and Skip goes on without waiting", async () => {
    post.mockReturnValue(new Promise(() => {})); // never answers
    const none = parseAiOutput(reply([tf("Is water wet in everyday speech?")]), parseContext);
    expect(renderHook(() => useAutoImages(none), { wrapper }).result.current.pending).toBe(false);

    const one = parseAiOutput(reply([tf("Is this Rome?", "Colosseum")]), parseContext);
    const { result: hook } = renderHook(() => useAutoImages(one), { wrapper });
    expect(hook.current.pending).toBe(true);
    act(() => hook.current.skip());
    expect(hook.current.pending).toBe(false);
    expect(hook.current.notFound).toEqual([1]);
  });
});
