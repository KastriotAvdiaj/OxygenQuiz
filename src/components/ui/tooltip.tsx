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
 * <b>No arrow, on `bg-background`</b> (2026-10-27). The arrow was a separate SVG whose border
 * could never line up with the box's — the seam showed where they met — and keeping its colours in
 * step with the box took a computed-style read on every open. Without it a tooltip is a small
 * floating label, the same as the creator's name over a quiz avatar (`CreatorAvatar`), so the two
 * hovers look alike. `bg-background` with an `border-border` hairline: it floats over cards and
 * the muted dashboard alike. Callers style nothing; `className` is for size (`max-w-xs`).
 */

const TooltipProvider = TooltipPrimitive.Provider;

type TooltipProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>;

/** Opens immediately on hover by default; pass `delayDuration` to slow one down. */
const Tooltip = ({ delayDuration = 0, ...props }: TooltipProps) => (
  <TooltipPrimitive.Root delayDuration={delayDuration} {...props} />
);

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, children, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground shadow-md",
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
  </TooltipPrimitive.Content>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
