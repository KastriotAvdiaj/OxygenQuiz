import { forwardRef, type SVGProps } from "react";

/**
 * The app's solid "play" icon: a triangle with rounded corners and no circle around it, the
 * same family as `EditPencil` (solid, rounded by a `currentColor` stroke with round joins, which
 * is why the drawn triangle sits 1.5 units inside the box — the 3-wide stroke adds the rest).
 * Replaced lucide's `CirclePlay` on the quiz menus (2026-10-24). Its points are shifted right of
 * centre so its visual weight, not its bounding box, is centred. Takes lucide's `size` prop.
 */
type Props = SVGProps<SVGSVGElement> & { size?: number | string };

export const PlayTriangle = forwardRef<SVGSVGElement, Props>(({ size = 24, ...props }, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M8 4.8 20 12 8 19.2Z" />
  </svg>
));
PlayTriangle.displayName = "PlayTriangle";
