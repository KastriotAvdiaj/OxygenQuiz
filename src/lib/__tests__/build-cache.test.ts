// @vitest-environment node
// Node, not jsdom: importing vite.config.ts loads Vite and esbuild, whose TextEncoder check fails
// under jsdom ("Invariant violation ... instanceof Uint8Array").
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import viteConfig from "../../../vite.config";

/**
 * Vite's content-hashed build output is cached by browsers for a year (`immutable`, in
 * `public/_headers`). That is only safe for a folder where **every** file is named by its
 * content: a file whose name stays put while its content changes would be frozen for a year.
 *
 * Vite's default output folder is `assets/`, and `public/assets/` (unhashed images such as
 * `/assets/oxygenquiz2.jpg`) is copied into the same `dist/assets/`. So the build gets its own
 * folder (`build.assetsDir`), and this asserts the three facts that keep the rule safe:
 * the immutable rule names that folder and no other, and nothing in `public/` lands in it.
 * docs/deployment/frontend-worker.md, "Headers".
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const HEADERS = readFileSync(path.join(ROOT, "public/_headers"), "utf-8");

/** The path patterns of every `_headers` rule that sets an `immutable` Cache-Control. */
function immutableRules(file: string): string[] {
  const rules: string[] = [];
  let current: string | null = null;
  for (const line of file.split(/\r?\n/)) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = line.trim(); // an unindented line opens a rule: its path pattern
    } else if (current && /^\s*cache-control:.*\bimmutable\b/i.test(line)) {
      rules.push(current);
    }
  }
  return rules;
}

const config = viteConfig as { build?: { assetsDir?: string } };
const assetsDir = config.build?.assetsDir;

describe("long-term caching of the build", () => {
  it("gives the build its own folder, not the one public/assets/ copies into", () => {
    expect(assetsDir).toBeTruthy();
    expect(assetsDir).not.toBe("assets");
  });

  it("puts nothing from public/ in the build's folder", () => {
    expect(existsSync(path.join(ROOT, "public", assetsDir ?? "assets"))).toBe(false);
  });

  it("caches exactly the build's folder as immutable", () => {
    expect(immutableRules(HEADERS)).toEqual([`/${assetsDir}/*`]);
  });
});
