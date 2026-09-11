import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/utils/cn";

/**
 * Tooltip — Radix for the behaviour, framer-motion for the motion.
 *
 * The split is deliberate and worth defending, because there are attractive drop-in
 * tooltips (Animate UI's, for one) that animate beautifully and are **not** Radix. Radix is
 * what gives this component collision flipping, portal and stacking behaviour, Escape
 * dismissal, showing on keyboard focus, `aria-describedby` wiring, and — the one that bites
 * hardest here — correct behaviour when a tooltip lives inside another Radix layer. This app
 * has exactly that: the dashboard rail's tooltips also render inside the mobile `Sheet`, and
 * any tooltip inside a `DialogContent` sits under a layer where Radix has put
 * `pointer-events: none` on the body. Swapping the primitive means re-proving all of it.
 *
 * So the primitive stays and only the animation changes: a spring scale/fade instead of the
 * tailwindcss-animate `data-[state]` classes, which also puts tooltips in the same motion
 * vocabulary as the nav pill, the tabs pill and the table's detail panel.
 *
 * How the two are joined: Radix owns `open`, this file mirrors it into context, and
 * `AnimatePresence` drives mount/unmount from that mirror. `forceMount` on the content is
 * what makes the exit animation possible at all — without it Radix removes the node the
 * instant it closes and there is nothing left to animate out.
 */

const TooltipProvider = TooltipPrimitive.Provider;

type TooltipContextValue = { open: boolean };
const TooltipContext = React.createContext<TooltipContextValue | null>(null);

type TooltipProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>;

/**
 * Mirrors Radix's open state into context so `TooltipContent` can hand it to
 * `AnimatePresence`. The `open` prop still wins whenever a caller controls the component, so
 * the mirror can never become a competing source of truth — the same shape `tabs.tsx` uses
 * for its sliding pill, and for the same reason: Radix owns the state and does not expose it.
 */
const Tooltip = ({
  delayDuration = 0,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: TooltipProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    defaultOpen ?? false
  );

  const isOpen = open ?? uncontrolledOpen;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange]
  );

  const context = React.useMemo<TooltipContextValue>(
    () => ({ open: isOpen }),
    [isOpen]
  );

  return (
    <TooltipContext.Provider value={context}>
      <TooltipPrimitive.Root
        delayDuration={delayDuration}
        open={isOpen}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </TooltipContext.Provider>
  );
};

const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * Grows out of the trigger rather than out of its own middle. Radix publishes the side it
 * actually landed on (after any collision flip) as a transform-origin custom property, so
 * this stays correct when a tooltip near the viewport edge flips from top to bottom.
 */
const TRANSFORM_ORIGIN = "var(--radix-tooltip-content-transform-origin)";

/** Quick and slightly soft. A tooltip that takes its time is a tooltip in the way. */
const OPEN_TRANSITION = {
  type: "spring",
  stiffness: 320,
  damping: 26,
  mass: 0.6,
} as const;

/** Leaving is a tween, not a spring: nobody wants to watch a dismissed tooltip settle. */
const CLOSE_TRANSITION = { duration: 0.12, ease: "easeOut" } as const;

type TooltipContentElement = React.ElementRef<typeof TooltipPrimitive.Content>;

const TooltipContent = React.forwardRef<
  TooltipContentElement,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, children, ...props }, forwardedRef) => {
  const open = React.useContext(TooltipContext)?.open ?? false;
  const prefersReducedMotion = useReducedMotion();
  const contentRef = React.useRef<TooltipContentElement | null>(null);
  // The arrow is a separate SVG, so it can't pick up `bg-*`/`border-*` classes
  // put on TooltipContent via cascade. Read back whatever color those classes
  // actually resolved to and hand it to the arrow directly, so any override on
  // className (a different bg color, etc.) is reflected on the arrow too.
  const [arrowColors, setArrowColors] = React.useState<{
    fill: string;
    stroke: string;
  } | null>(null);

  React.useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const computed = getComputedStyle(node);
    setArrowColors({ fill: computed.backgroundColor, stroke: computed.borderColor });
    // `open` is a dependency now: the node is unmounted while closed, so the colours have to
    // be read again on each open rather than once for the life of the component.
  }, [className, open]);

  return (
    <AnimatePresence>
      {open && (
        <TooltipPrimitive.Content
          // forceMount hands removal to AnimatePresence. Radix would otherwise unmount on
          // close and the exit animation would never run.
          forceMount
          // asChild so the motion element IS the content box — background, border, padding
          // and the arrow all scale as one object. Radix puts its positioning transform on
          // a wrapper it renders above this element, so animating `scale` here does not
          // fight it; animating the wrapper would.
          asChild
          sideOffset={sideOffset}
          {...props}
        >
          <motion.div
            key="tooltip-content"
            ref={(node) => {
              contentRef.current = node;
              if (typeof forwardedRef === "function") forwardedRef(node);
              else if (forwardedRef) forwardedRef.current = node;
            }}
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.94 }
            }
            animate={{ opacity: 1, scale: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : { opacity: 0, scale: 0.96, transition: CLOSE_TRANSITION }
            }
            transition={
              prefersReducedMotion ? { duration: 0 } : OPEN_TRANSITION
            }
            style={{ transformOrigin: TRANSFORM_ORIGIN }}
            className={cn(
              "z-50 border border-border bg-muted rounded-md px-3 py-2 text-xs",
              className
            )}
          >
            {children}
            <TooltipPrimitive.Arrow
              className="fill-muted stroke-border"
              strokeWidth={2}
              style={
                arrowColors
                  ? { fill: arrowColors.fill, stroke: arrowColors.stroke }
                  : undefined
              }
            />
          </motion.div>
        </TooltipPrimitive.Content>
      )}
    </AnimatePresence>
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
