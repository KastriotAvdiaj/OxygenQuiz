import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "../safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    "/",
    "/multiplayer-menu",
    "/quiz/12?shareToken=abc",
    "/associations/play/3#top",
    "/%0a", // percent-encoded text is just part of a path here
  ])("keeps a path on this site: %s", (path) => {
    expect(safeRedirectPath(path)).toBe(path);
  });

  it.each([
    null,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "/\t/evil.example",
    "javascript:alert(1)",
    "quizzes",
    "/a\\b",
  ])("drops anything that could leave the site: %s", (value) => {
    expect(safeRedirectPath(value)).toBeNull();
  });
});
