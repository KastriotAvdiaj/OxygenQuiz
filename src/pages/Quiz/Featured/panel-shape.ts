/**
 * The outline of a category panel: a rounded card with a tab rising from its top-right edge,
 * where the category name sits (docs/quiz/featured-quizzes.md, "The panel shape").
 *
 * Built as an SVG path for `clip-path: path(...)` rather than two stacked boxes, so the photo
 * runs unbroken from the card up into the tab — the tab is part of the card, not a label on it.
 * `path()` takes pixels only, so the panel measures itself and rebuilds this on resize.
 *
 * ```
 *                    ╭──────────╮   ← tab: tabWidth × tabHeight
 *  ╭─────────────────╯          │
 *  │                            │   ← body
 *  ╰────────────────────────────╯
 * ```
 */
export type PanelShape = {
  width: number;
  height: number;
  tabWidth: number;
  tabHeight: number;
  radius: number;
};

/** Rounds to 0.1px so the path string is stable across sub-pixel layout noise. */
const n = (v: number) => Math.round(v * 10) / 10;

export function panelPath({ width: w, height: h, tabWidth, tabHeight: t, radius }: PanelShape): string {
  // Never wider than the card, never so round the corners overlap.
  const tw = Math.min(tabWidth, w);
  const r = Math.max(0, Math.min(radius, t / 2, (h - t) / 2, tw / 2));
  const x = w - tw; // where the tab starts
  const s = Math.min(r, x); // the joint's curve; none when the tab is the full width

  return [
    `M0 ${n(t + r)}`,
    `Q0 ${n(t)} ${n(r)} ${n(t)}`, // body, top-left corner
    `L${n(x - s)} ${n(t)}`,
    `Q${n(x)} ${n(t)} ${n(x)} ${n(t - s)}`, // the joint: body top curving up into the tab
    `L${n(x)} ${n(r)}`,
    `Q${n(x)} 0 ${n(x + r)} 0`, // tab, top-left corner
    `L${n(w - r)} 0`,
    `Q${n(w)} 0 ${n(w)} ${n(r)}`, // tab, top-right corner
    `L${n(w)} ${n(h - r)}`,
    `Q${n(w)} ${n(h)} ${n(w - r)} ${n(h)}`,
    `L${n(r)} ${n(h)}`,
    `Q0 ${n(h)} 0 ${n(h - r)}`,
    "Z",
  ].join(" ");
}
