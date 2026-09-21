/**
 * Which copy of the pitch is rendering. The hero draws the pitch twice (see `Home.tsx`):
 * - `"page"` — the real copy, on the page background; owns every link and button.
 * - `"wave"` — the decorative copy masked to the blue wave; recoloured to read on blue,
 *   non-interactive, its buttons invisible placeholders.
 */
export type HeroTone = "page" | "wave";

/** Text on the wave: white in the light theme, near-black (the page background) in the dark. */
export const ON_WAVE_TEXT = "text-white dark:text-background";
