import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { queryConfig } from "@/lib/React-query";

const get = vi.fn();
const post = vi.fn();
vi.mock("@/lib/Api-client", () => ({
  apiService: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    put: vi.fn(),
    delete: vi.fn(),
  },
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

import { useGuestQuizSession } from "../use-guest-quiz-session";

const session = { id: "session-1", quizTitle: "Test quiz", totalQuestions: 2 };
const question = { quizQuestionId: 10, questionText: "First question", options: [] };

// StrictMode is what the app actually runs under (src/main.tsx), and it is load-bearing
// here: it mounts, tears the effects down, and mounts again, which is exactly the
// sequence that used to strand the session-creation mutation. See docs/auth/guest-play.md.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <React.StrictMode>
    <QueryClientProvider client={new QueryClient({ defaultOptions: queryConfig })}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

describe("useGuestQuizSession under StrictMode", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    post.mockResolvedValue(session);
    get.mockResolvedValue(question);
  });

  it("leaves the loading state with the first question", async () => {
    const { result } = renderHook(() => useGuestQuizSession({ quizId: 1 }), { wrapper });

    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));

    expect(result.current.quizSession).toEqual(session);
    expect(result.current.currentQuestion).toEqual(question);
    expect(result.current.error).toBeNull();
  });

  it("surfaces a failed session creation as an error", async () => {
    post.mockRejectedValue(
      Object.assign(new Error("Request failed with status code 500"), {
        response: { status: 500, data: { message: "Failed to create quiz session." } },
      })
    );

    const { result } = renderHook(() => useGuestQuizSession({ quizId: 1 }), { wrapper });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toContain("Failed to create quiz session.");
  });

  it("creates exactly one session per mount", async () => {
    const { result } = renderHook(() => useGuestQuizSession({ quizId: 1 }), { wrapper });

    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));

    expect(post.mock.calls.filter((c) => String(c[0]).includes("guest-quiz-sessions")).length).toBe(1);
  });
});
