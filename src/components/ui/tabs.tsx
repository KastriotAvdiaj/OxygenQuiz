import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion, type Transition } from "framer-motion";

import { cn } from "@/utils/cn";

/**
 * Tabs — Radix Tabs with a pill that slides between triggers.
 *
 * The pill is a single `layoutId` element rendered inside whichever trigger is
 * active; framer-motion animates it from the trigger it just left. Only one is
 * ever mounted and nothing wraps the triggers, so the tablist keeps its
 * `tablist > tab` structure and a `grid`/`flex` TabsList lays the triggers out
 * exactly as its className says.
 */

const PILL_TRANSITION: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 26,
};

type TabsContextValue = {
  activeValue: string | undefined;
  /** Per root, so two Tabs on one page never slide a pill into each other. */
  pillLayoutId: string;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

/**
 * Mirrors the active value for the pill. Radix owns the value and doesn't
 * expose it, and a trigger can't read its own `data-state` during render — so
 * this copy is the only way the pill knows which trigger to sit in. The `value`
 * prop still wins whenever the caller controls the component, so the copy can
 * never become a competing source of truth.
 */
const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ value, defaultValue, onValueChange, ...props }, ref) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<
    string | undefined
  >(defaultValue);
  const pillLayoutId = React.useId();

  const activeValue = value ?? uncontrolledValue;

  const handleValueChange = React.useCallback(
    (next: string) => {
      setUncontrolledValue(next);
      onValueChange?.(next);
    },
    [onValueChange]
  );

  const context = React.useMemo(
    () => ({ activeValue, pillLayoutId }),
    [activeValue, pillLayoutId]
  );

  return (
    <TabsContext.Provider value={context}>
      <TabsPrimitive.Root
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        {...props}
      />
    </TabsContext.Provider>
  );
});
Tabs.displayName = TabsPrimitive.Root.displayName;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-12 items-center justify-center gap-4 rounded-2xl bg-primary/20 p-1.5 text-muted-foreground shadow-lg backdrop-blur-sm border border-primary/30 dark:border-primary/20",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

type TabsTriggerProps = React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Trigger
> & {
  /** Extra classes for the sliding pill while this trigger is active. */
  activeClassName?: string;
};

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, activeClassName, children, ...props }, ref) => {
  const context = React.useContext(TabsContext);
  const isActive = context?.activeValue === props.value;

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "relative inline-flex w-full items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium",
        "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:text-white",
        "data-[state=inactive]:bg-background/50 data-[state=inactive]:hover:bg-background data-[state=inactive]:hover:text-foreground/90",
        // The travelling pill belongs to the trigger it is moving *into*, so
        // without this it would pass under a neighbour in one direction and
        // over it in the other. Lifting the active trigger keeps both ways
        // looking the same. No `overflow-hidden` here for the same reason: it
        // would clip the pill for the whole trip.
        "z-0 data-[state=active]:z-10",
        className
      )}
      {...props}
    >
      {isActive && context && (
        <motion.span
          aria-hidden
          layoutId={context.pillLayoutId}
          transition={PILL_TRANSITION}
          className={cn(
            "absolute inset-0 z-0 rounded-xl bg-primary shadow-md",
            activeClassName
          )}
        />
      )}
      <span className="relative z-10">{children}</span>
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      // Enter animation only. An exit animation makes Radix hold the outgoing
      // panel in the layout until it finishes, so for those ~200ms the page is
      // as tall as both panels put together — measured 800px -> 1919px on the
      // results page — and the app-shell scrollbar flashes in and out.
      "mt-6",
      "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-95",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "backdrop-blur-sm",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
export type { TabsTriggerProps };
