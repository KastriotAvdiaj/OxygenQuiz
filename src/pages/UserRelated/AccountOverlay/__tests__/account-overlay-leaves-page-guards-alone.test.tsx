import { describe, it, expect, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";

import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { AccountOverlay } from "../AccountOverlay";

vi.mock("@/lib/Auth", () => ({
  useUser: () => ({ data: { id: "u1" } }),
  useLogout: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/pages/UserRelated/SettingsPage/useSettingsForm", () => ({
  useSettingsForm: () => ({ isDirty: false, isError: false, form: null, isSaving: false, discard: vi.fn(), save: vi.fn() }),
}));

// A page that guards its own exit, the way the quiz builder does.
const GuardedPage = () => {
  const { showLeaveDialog } = useNavigationGuard(true);
  return <p>{showLeaveDialog ? "asked" : "not asked"}</p>;
};

/**
 * React Router asks only the blocker registered last. The overlay is mounted on every route,
 * after the `<Outlet />`, so on a fresh mount it registers after the page — and when it held
 * an always-on `useBlocker(false)`, the page's guard was never asked (2026-11-15).
 */
describe("AccountOverlay, closed", () => {
  it("doesn't silence a page's leave guard when both mount together", async () => {
    const router = createMemoryRouter(
      [
        {
          element: (
            <>
              <Outlet />
              <AccountOverlay />
            </>
          ),
          children: [
            { path: "/builder", element: <GuardedPage /> },
            { path: "/elsewhere", element: <p>left</p> },
          ],
        },
      ],
      { initialEntries: ["/builder"] },
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await act(async () => {
      await router.navigate("/elsewhere");
    });

    expect(screen.getByText("asked")).toBeTruthy();
    expect(router.state.location.pathname).toBe("/builder");
  });
});
