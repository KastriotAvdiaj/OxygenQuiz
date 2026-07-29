import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { queryConfig } from "@/lib/React-query";

// Every auth-config call 404s — the deploy-skew condition (frontend ahead of API).
const get = vi.fn();
vi.mock("@/lib/Api-client", () => ({
  apiService: {
    get: (...args: any[]) => get(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  api: { get: vi.fn(), post: vi.fn(), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
}));

import SignupFlow from "../SignupComponents/SignupFlow";

const notFound = () =>
  Object.assign(new Error("Request failed with status code 404"), {
    response: { status: 404, data: {} },
  });

const renderFlow = () => {
  const client = new QueryClient({ defaultOptions: queryConfig });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SignupFlow />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("signup flow when /Authentication/auth-config is unavailable", () => {
  beforeEach(() => {
    get.mockReset();
    get.mockRejectedValue(notFound());
  });

  it("requests auth-config exactly once", async () => {
    renderFlow();
    await new Promise((r) => setTimeout(r, 1000));
    const authConfigCalls = get.mock.calls.filter((c) =>
      String(c[0]).includes("auth-config")
    );
    expect(authConfigCalls.length).toBe(1);
  });

  it("still renders — and fails closed to the invite gate", async () => {
    renderFlow();
    // Not the spinner, and not a silently-open signup: the gate is what an unreadable
    // config must fall back to, since the server requires a code regardless.
    expect(await screen.findByText(/invite only right now/i)).toBeTruthy();
  });
});
