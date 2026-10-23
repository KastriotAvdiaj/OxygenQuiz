import { forwardRef, type SVGProps } from "react";

/**
 * The app's "edit" icon: a solid pencil with rounded ends and a separate cap, drawn on a
 * diagonal. Softer than lucide's outline pencils, and it reads at 12px where a 2px outline turns
 * to mush. Use it on every action that edits something; the pencils that mean something else
 * (the type-the-answer question type, the hero's "create" button, the Associations guess box)
 * stay lucide.
 *
 * Drawn horizontally, then rotated -45° and scaled 1.12 about the centre so it matches the visual
 * size of a lucide glyph: a tip triangle and body, a gap, then the cap. Filled *and* stroked in `currentColor` with round joins, so every corner is rounded by
 * the stroke without hand-drawn arcs; that stroke adds 1 unit on each side, which is why the gap
 * between body and cap is 3.5 wide (1.5 left visible). Takes lucide's `size` prop so it drops in
 * beside lucide icons. Checked rendered at 12, 16 and 48px (2026-10-23).
 */
type Props = SVGProps<SVGSVGElement> & { size?: number | string };

export const EditPencil = forwardRef<SVGSVGElement, Props>(({ size = 24, ...props }, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <g transform="translate(12 12) rotate(-45) scale(1.12) translate(-12 -12)">
      <path d="M3.5 12 7.5 9H15v6H7.5Z" />
      <path d="M18.5 9h1.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1.5Z" />
    </g>
  </svg>
));
EditPencil.displayName = "EditPencil";
