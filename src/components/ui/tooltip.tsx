import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/utils/cn";

/**
 * Tooltip — Radix for behaviour *and* motion, the same as `popover.tsx` and `dropdown-menu.tsx`.
 *
 * Radix is what gives this collision flipping, Escape dismissal, showing on keyboard focus,
 * `aria-describedby` wiring, and correct behaviour inside other Radix layers (the dashboard
 * rail's tooltips also render inside the mobile `Sheet`; anything in a `DialogContent` sits under
 * a layer that put `pointer-events: none` on the body).
 *
 * <b>Why not framer-motion (it was, briefly).</b> Radix positions the popper one frame *after*
 * mounting it: until floating-ui has measured, the wrapper is parked at `translate(0, -200%)` and
 * the transform-origin variable is empty. Radix covers that gap only for CSS — it sets
 * `animation: none` on the content until placed. A framer spring is JS, so it started on mount,
 * from the parked spot and the wrong origin, then jumped to the real position mid-animation: the
 * "pops up, then glitches for a split second" flash. The `tailwindcss-animate` classes below wait
 * for placement, and Radix's Presence holds the node for the exit animation, so neither
 * `forceMount` nor an open-state mirror is needed any more.
 *
 * <b>The border.</b> `border-border` on `bg-muted` is ~1.05:1 in light mode (91% vs 93%
 * lightness) and barely more in dark — declared, but invisible. It is a foreground tint instead,
 * which reads in both themes. One class, no `dark:` variant, so a caller's own
 * `border-foreground/50` still wins in dark mode too.
 */

const TooltipProvider = TooltipPrimitive.Provider;

type TooltipProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>;

/** Opens immediately on hover by default; pass `delayDuration` to slow one down. */
const Tooltip = ({ delayDuration = 0, ...props }: TooltipProps) => (
  <TooltipPrimitive.Root delayDuration={delayDuration} {...props} />
);

const TooltipTrigger = TooltipPrimitive.Trigger;

type TooltipContentElement = React.ElementRef<typeof TooltipPrimitive.Content>;

const TooltipContent = React.forwardRef<
  TooltipContentElement,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, children, ...props }, forwardedRef) => {
  // The arrow is a separate SVG, so it can't pick up `bg-*`/`border-*` classes put on the
  // content. Read back what those classes resolved to and hand it over, so an override on
  // `className` reaches the arrow too. A callback ref, not an Effect: the content mounts on every
  // open, and the moment it attaches is the moment to read it.
  const [arrowColors, setArrowColors] = React.useState<{ fill: string; stroke: string } | null>(
    null,
  );
  const ref = React.useCallback(
    (node: TooltipContentElement | null) => {
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
      if (!node) return;
      const computed = getComputedStyle(node);
      const next = { fill: computed.backgroundColor, stroke: computed.borderTopColor };
      setArrowColors((prev) =>
        prev && prev.fill === next.fill && prev.stroke === next.stroke ? prev : next,
      );
    },
    [forwardedRef],
  );

  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 rounded-md border border-foreground/20 bg-muted px-3 py-2 text-xs shadow-md",
        // Enter/exit: 150ms fade + slight zoom, grown from the side it actually landed on. Under
        // reduced motion it only fades (arrive, don't travel — docs/development/motion.md).
        "origin-[--radix-tooltip-content-transform-origin] animate-in fade-in-0 zoom-in-95 duration-150",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        "motion-reduce:zoom-in-100 motion-reduce:data-[state=closed]:zoom-out-100",
        className,
      )}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow
        className="fill-muted stroke-foreground/20"
        strokeWidth={2}
        style={arrowColors ? { fill: arrowColors.fill, stroke: arrowColors.stroke } : undefined}
      />
    </TooltipPrimitive.Content>
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
