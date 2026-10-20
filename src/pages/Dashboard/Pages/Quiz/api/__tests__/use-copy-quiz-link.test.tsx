import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const post = vi.fn();
vi.mock("@/lib/Api-client", () => ({
  apiService: { get: vi.fn(), post: (...args: unknown[]) => post(...args), put: vi.fn(), delete: vi.fn() },
  api: { get: vi.fn(), post: vi.fn(), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
}));

import { useCopyQuizLink } from "../use-copy-quiz-link";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

/**
 * Copy link gives a Public quiz's listing URL and an Unlisted quiz's share link
 * (docs/quiz/quiz-listing.md, "Copy link").
 */
describe("useCopyQuizLink", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    post.mockReset();
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  it("copies a Public quiz's listing URL without minting a share token", async () => {
    const { result } = renderHook(() => useCopyQuizLink(), { wrapper });

    act(() => result.current.copy({ id: 32, title: "Kërrë gjeneral për makina", status: "Public" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("https://oxygenquiz.com/q/32/kerre-gjeneral-per-makina"),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("copies an Unlisted quiz's share link, minting the token", async () => {
    post.mockResolvedValue({ shareToken: "0123456789abcdef" });
    const { result } = renderHook(() => useCopyQuizLink(), { wrapper });

    act(() => result.current.copy({ id: 7, title: "Secret", status: "Unlisted" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/play/shared/0123456789abcdef`),
    );
    expect(post).toHaveBeenCalledWith("/quiz/7/share-link");
  });
});
