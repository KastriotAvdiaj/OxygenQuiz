import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { type Transition } from "motion/react";

import {
  Highlight,
  HighlightItem,
} from "@/components/animate-ui/primitives/effects/highlight";
import { cn } from "@/utils/cn";

/**
 * Tabs — Radix Tabs (a11y, roving focus, unmounted inactive panels)
 * with the animate-ui `Highlight` primitive supplying the sliding
 * active pill behind the triggers.
 */

const HIGHLIGHT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 26,
};

/** Mirrors the Radix root value so <TabsList> can drive the highlight. */
const TabsValueContext = React.createContext<string | undefined>(undefined);

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ value, defaultValue, onValueChange, ...props }, ref) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<
    string | undefined
  >(defaultValue);

  const activeValue = value ?? uncontrolledValue;

  const handleValueChange = React.useCallback(
    (next: string) => {
      setUncontrolledValue(next);
      onValueChange?.(next);
    },
    [onValueChange]
  );

  return (
    <TabsValueContext.Provider value={activeValue}>
      <TabsPrimitive.Root
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        {...props}
      />
    </TabsValueContext.Provider>
  );
});
Tabs.displayName = TabsPrimitive.Root.displayName;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const activeValue = React.useContext(TabsValueContext);

  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-4 rounded-2xl bg-primary/20 p-1.5 text-muted-foreground shadow-lg backdrop-blur-sm border border-primary/30 dark:border-primary/20",
        className
      )}
      {...props}
    >
      <Highlight
        controlledItems
        click={false}
        value={activeValue ?? null}
        transition={HIGHLIGHT_TRANSITION}
        className="inset-0 rounded-xl bg-primary shadow-md"
      >
        {children}
      </Highlight>
    </TabsPrimitive.List>
  );
});
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
>(({ className, activeClassName, children, ...props }, ref) => (
  <HighlightItem value={props.value} activeClassName={activeClassName}>
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex w-full items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 ease-in-out",
        "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:text-white data-[state=active]:scale-105",
        "data-[state=inactive]:bg-background/50 data-[state=inactive]:hover:bg-background data-[state=inactive]:hover:text-foreground/90",
        "relative overflow-hidden group",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </TabsPrimitive.Trigger>
  </HighlightItem>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-6 transition-all duration-300 ease-in-out",
      "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-95",
      "data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 data-[state=inactive]:zoom-out-95",
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
