import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { Button } from "../button";

describe("Button", () => {
  it("renders a normal button with its icon and label", () => {
    render(<Button icon={<span data-testid="icon" />}>Save</Button>);

    expect(screen.getByRole("button").textContent).toContain("Save");
    expect(screen.getByTestId("icon")).toBeTruthy();
  });

  // `asChild` hands the rendering off to a Radix Slot, which accepts exactly one element
  // child. The guest-play error screens are the only callers, so a regression here is
  // invisible until an error actually needs showing — see docs/auth/guest-play.md.
  it("renders as its child element when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/login">Log In</a>
      </Button>
    );

    const link = screen.getByRole("link", { name: "Log In" });
    expect(link.getAttribute("href")).toBe("/login");
    expect(link.className).toContain("whitespace-nowrap"); // button styling reached the child
  });

  it("keeps the icon when asChild is set", () => {
    render(
      <Button asChild icon={<span data-testid="icon" />}>
        <a href="/login">Log In</a>
      </Button>
    );

    const link = screen.getByRole("link", { name: "Log In" });
    expect(link.querySelector("[data-testid='icon']")).toBeTruthy();
  });
});
