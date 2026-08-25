import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_APP_FONT,
  DEFAULT_QUIZ_FONT,
  FONT_OPTIONS,
  normalizeFont,
} from "../fonts";

/**
 * The default app/quiz fonts are declared **twice**: once in `global.css`, which paints
 * them before any JavaScript runs, and once here as the constant `SettingsApplier`
 * applies for a user with no saved preference.
 *
 * They disagreed for months — the constant said "Baloo 2", `:root` said "Noto Sans" —
 * and nothing surfaced it, because the applier only ran when a preference *existed*, so
 * the constant never reached the page. It reached the Settings <Select> instead, which
 * meant that page showed a font the user wasn't using and could save it onto them.
 *
 * Two declarations of one fact don't stay equal by good intentions, so this asserts it.
 * If you change one, this fails until you change the other.
 */
// `import.meta.url`, not `__dirname`: Vite compiles test files as ESM, where
// `__dirname` does not exist.
const GLOBAL_CSS = readFileSync(
  fileURLToPath(new URL("../../global.css", import.meta.url)),
  "utf-8",
);

/** Reads a `--font-*` value out of the `:root` block and unquotes it. */
const declaredInCss = (variable: string): string => {
  const match = GLOBAL_CSS.match(
    new RegExp(`${variable}\\s*:\\s*([^;]+);`),
  );
  if (!match) throw new Error(`${variable} is not declared in global.css`);
  return match[1].trim().replace(/^["']|["']$/g, "");
};

describe("font defaults", () => {
  it("DEFAULT_APP_FONT matches the --font-app fallback in global.css", () => {
    expect(declaredInCss("--font-app")).toBe(DEFAULT_APP_FONT);
  });

  it("DEFAULT_QUIZ_FONT matches the --font-quiz fallback in global.css", () => {
    expect(declaredInCss("--font-quiz")).toBe(DEFAULT_QUIZ_FONT);
  });

  // The Settings <Select> renders FONT_OPTIONS and shows the default for an empty
  // stored value. A default that isn't in the list renders as no selection at all.
  it("both defaults are selectable in the settings picker", () => {
    const values = FONT_OPTIONS.map((f) => f.value);
    expect(values).toContain(DEFAULT_APP_FONT);
    expect(values).toContain(DEFAULT_QUIZ_FONT);
  });

  it("normalizeFont falls back for an unknown or empty stored value", () => {
    expect(normalizeFont("", DEFAULT_APP_FONT)).toBe(DEFAULT_APP_FONT);
    expect(normalizeFont(null, DEFAULT_APP_FONT)).toBe(DEFAULT_APP_FONT);
    expect(normalizeFont("Comic Sans MS", DEFAULT_APP_FONT)).toBe(DEFAULT_APP_FONT);
    expect(normalizeFont("Inter", DEFAULT_APP_FONT)).toBe("Inter");
  });
});
