import type { CSSProperties } from "react";

/**
 * The landing wave's geometry — the one source for both the drawn wave (`<Wave>`) and the mask
 * that turns the headline's colour on it (`<Hero>`), so the two can never drift apart.
 *
 * Paths are drawn in their own viewBox and stretched to the page with
 * `preserveAspectRatio="none"` (the SVG) / `mask-size: 100% 100%` (the mask) — the same
 * stretch, so they line up at every size.
 */
export interface WaveShape {
  viewBox: string;
  d: string;
}

/** `lg` up: high on the left, a swoosh a third of the way across, then an easing slope. */
export const WAVE_DESKTOP: WaveShape = {
  viewBox: "0 0 1600 900",
  d: "M0,169 C60,158 170,165 270,205 C350,237 420,300 480,385 C510,430 540,470 610,500 C700,540 820,570 1000,588 C1200,605 1350,640 1600,736 L1600,900 L0,900 Z",
};

/**
 * Below `lg`: the same idea for a tall screen — high on the left and swooping down to the right
 * **through the middle of the page**, so it crosses the headline and the colour change shows on
 * phones too. (A flat band along the bottom never reached the text.)
 */
export const WAVE_MOBILE: WaveShape = {
  viewBox: "0 0 400 800",
  d: "M0,285 C55,272 115,290 165,350 C210,405 255,440 325,458 C360,467 385,478 400,488 L400,800 L0,800 Z",
};

const toMaskUrl = ({ viewBox, d }: WaveShape) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}' preserveAspectRatio='none'><path d='${d}'/></svg>`,
  )}")`;

/**
 * Both masks as CSS custom properties. Set them on the masked element and pick one per
 * breakpoint with classes (`[mask-image:var(--wave-mask-sm)] lg:[mask-image:var(--wave-mask-lg)]`)
 * — a data URL is too long to live in a class name.
 */
export const WAVE_MASK_VARS = {
  "--wave-mask-sm": toMaskUrl(WAVE_MOBILE),
  "--wave-mask-lg": toMaskUrl(WAVE_DESKTOP),
} as CSSProperties;
