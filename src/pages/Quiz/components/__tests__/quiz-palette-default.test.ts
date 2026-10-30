import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { DEFAULT_QUIZ_PALETTE, parseQuizPalette } from "../quiz-palette";

/**
 * A quiz with no readable category palette is painted in the app's primary colour. That colour is
 * declared twice: as `--primary` (HSL) in global.css, and as hex here, because the palette
 * helpers do contrast maths on hex. This asserts the two agree, so changing the brand colour in
 * one place and not the other fails here. Same idea as font-defaults.test.ts (and the same
 * node:path resolution, for the same jsdom reason).
 */
const GLOBAL_CSS = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../global.css"),
  "utf-8",
);

/** `--primary` from the light theme (the first `:root` block that declares it), as `#rrggbb`. */
function primaryHex(css: string): string {
  const root =
    [...css.matchAll(/:root\s*{([^}]*)}/g)].map((m) => m[1]).find((b) => b.includes("--primary:")) ?? "";
  const match = root.match(/--primary:\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!match) throw new Error("--primary not found in :root");
  const [h, s, l] = match.slice(1).map(Number);
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

describe("the default quiz palette", () => {
  it("leads with the app's primary colour", () => {
    expect(DEFAULT_QUIZ_PALETTE[0].toLowerCase()).toBe(primaryHex(GLOBAL_CSS));
  });

  it("is what a quiz with no palette, or an unreadable one, gets", () => {
    expect(parseQuizPalette(undefined)[0]).toBe(DEFAULT_QUIZ_PALETTE[0]);
    expect(parseQuizPalette("not json")[0]).toBe(DEFAULT_QUIZ_PALETTE[0]);
    expect(parseQuizPalette("[]")[0]).toBe(DEFAULT_QUIZ_PALETTE[0]);
  });
});
