import { describe, it, expect, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CanonicalLink, canonicalHref } from "../canonical-link";

const canonical = () =>
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute("href");

describe("canonicalHref", () => {
  it.each([
    ["/", "https://oxygenquiz.com/"],
    ["/choose-quiz", "https://oxygenquiz.com/choose-quiz"],
    ["/choose-quiz/", "https://oxygenquiz.com/choose-quiz"],
    ["/choose-quiz//", "https://oxygenquiz.com/choose-quiz"],
  ])("%s → %s", (path, expected) => {
    expect(canonicalHref("https://oxygenquiz.com", path)).toBe(expected);
  });
});

describe("CanonicalLink", () => {
  afterEach(() => document.head.querySelectorAll('link[rel="canonical"]').forEach((l) => l.remove()));

  it("writes the route's clean address, without the query string", () => {
    render(
      <MemoryRouter initialEntries={["/choose-quiz/?ref=newsletter"]}>
        <CanonicalLink />
      </MemoryRouter>,
    );
    expect(canonical()).toBe(`${window.location.origin}/choose-quiz`);
  });

  it("updates the existing link rather than adding a second one", () => {
    const existing = document.createElement("link");
    existing.rel = "canonical";
    existing.href = "https://oxygenquiz.com/q/15/old";
    document.head.appendChild(existing);

    render(
      <MemoryRouter initialEntries={["/q/15/shkrimtaret-shqiptare"]}>
        <CanonicalLink />
      </MemoryRouter>,
    );
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(canonical()).toBe(`${window.location.origin}/q/15/shkrimtaret-shqiptare`);
  });
});
