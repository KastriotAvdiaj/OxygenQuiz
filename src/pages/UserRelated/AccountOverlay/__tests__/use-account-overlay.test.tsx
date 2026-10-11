import { describe, it, expect } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useBlocker } from "react-router-dom";

import { useAccountOverlay } from "../use-account-overlay";

// The overlay's own arrangement in miniature: its open state comes from the URL, and a guard
// blocks every navigation — closing included — the way the unsaved-changes guard does.
const Probe = () => {
  const { isOpen, close } = useAccountOverlay();
  const blocker = useBlocker(true);
  return (
    <>
      <p>{isOpen ? "open" : "closed"}</p>
      <p>{blocker.state}</p>
      <button onClick={close}>close</button>
    </>
  );
};

const renderOpen = () => {
  const router = createMemoryRouter([{ path: "/", element: <Probe /> }], {
    initialEntries: ["/?settings=appearance"],
  });
  render(<RouterProvider router={router} />);
  return router;
};

describe("useAccountOverlay", () => {
  it("stays open when the close is blocked", async () => {
    const router = renderOpen();

    await act(async () => screen.getByText("close").click());

    // The guard caught it, so the overlay — which holds the guard's dialog — must still be there.
    expect(screen.getByText("blocked")).toBeTruthy();
    expect(screen.getByText("open")).toBeTruthy();
    expect(router.state.location.search).toBe("?settings=appearance");
  });
});
