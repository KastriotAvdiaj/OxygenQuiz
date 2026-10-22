import { forwardRef, type SVGProps } from "react";

/**
 * A pen inside a circle — a softer "edit" than lucide's bare pencils. lucide-react 0.428 has no
 * such icon, so this draws one in its conventions (24 grid, 2px round strokes, currentColor) and
 * takes the same `size` prop, so it sits beside lucide icons without looking borrowed.
 *
 * The pen is lucide's `pen` path scaled to 0.42 and centred in the circle. Its stroke is 2 / 0.42
 * so it draws at the circle's weight at every size (`vector-effect: non-scaling-stroke` would pin
 * it to 2 *screen* pixels instead, too thin when the icon is large). Checked rendered at 16px and
 * 96px (2026-10-22).
 */
type Props = SVGProps<SVGSVGElement> & { size?: number | string };

export const CirclePen = forwardRef<SVGSVGElement, Props>(({ size = 24, ...props }, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path
      d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"
      transform="translate(7.2 7) scale(0.42)"
      strokeWidth={4.75}
    />
  </svg>
));
CirclePen.displayName = "CirclePen";
