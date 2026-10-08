import type { SVGProps } from "react";

/**
 * The drawing rules every category illustration shares — the landing page's line globe's
 * (docs/home/landing-page.md, "The globe"): outlines at 70% of the line colour, solid parts filled
 * at 45%, background detail at 18%, and the amber `cta` for the few warm accents.
 *
 * The line colour is `currentColor` — white, set on the panel (`category-panel.tsx`) — so the
 * drawings sit on the category's own colour, whatever an admin sets it to. Every stroke is
 * `non-scaling-stroke`: the drawing is scaled to the card, the lines stay a pixel or two thick.
 */
type Paint = SVGProps<SVGElement>;

export const LINE = {
  fill: "none",
  stroke: "currentColor",
  strokeOpacity: 0.7,
  strokeWidth: 2,
  strokeLinejoin: "round",
  strokeLinecap: "round",
  vectorEffect: "non-scaling-stroke",
} satisfies Paint;

/** A solid part: filled at 45%, outlined like any line. */
export const FILL = {
  ...LINE,
  fill: "currentColor",
  fillOpacity: 0.45,
} satisfies Paint;

/** A part filled more faintly — for variety where many solid shapes sit together. */
export const TINT = { ...FILL, fillOpacity: 0.18 } satisfies Paint;

/** Background detail: grid lines, seams, courses of stone. */
export const FAINT = {
  fill: "none",
  stroke: "currentColor",
  strokeOpacity: 0.18,
  strokeWidth: 1.25,
  vectorEffect: "non-scaling-stroke",
} satisfies Paint;

/**
 * Amber accents. Drawn inside a `text-cta` group (`currentColor` is then the amber), because the
 * colour is a theme token and a class is how a token reaches an element.
 */
export const ACCENT_LINE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round",
  vectorEffect: "non-scaling-stroke",
} satisfies Paint;

export const ACCENT_FILL = {
  fill: "currentColor",
  fillOpacity: 0.85,
  stroke: "currentColor",
  strokeWidth: 2,
  vectorEffect: "non-scaling-stroke",
} satisfies Paint;

/**
 * The drawing box. Wide and short like the panel on a desktop; on a phone the panel is nearly
 * square and the drawing is cropped to its right-hand end (`xMaxYMax slice` in `CategoryArt`), so
 * each drawing keeps its main subject on the right.
 */
export const ART_W = 1600;
export const ART_H = 380;
