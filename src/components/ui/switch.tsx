import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/utils/cn";

type SwitchProps = React.ComponentPropsWithoutRef<
  typeof SwitchPrimitives.Root
> & {
  /** "default" is the original 24×44px pill; "sm" is a compact 20×36px. */
  size?: "default" | "sm";
};

/**
 * Pill toggle: solid primary track when on, muted track when off, round
 * white thumb that slides across. The thumb stretches slightly while the
 * switch is pressed — a nod to the app's pushable controls.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, size = "default", ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer group inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-foreground/20 dark:data-[state=unchecked]:bg-foreground/30",
      size === "default" ? "h-5 w-11" : "h-4 w-9",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block rounded-full bg-white shadow-md ring-0 transition-all duration-200 data-[state=unchecked]:translate-x-0",
        size === "default"
          ? "h-3 w-4 group-active:w-6 data-[state=checked]:translate-x-5 data-[state=checked]:group-active:translate-x-4"
          : "h-4 w-4 group-active:w-5 data-[state=checked]:translate-x-4 data-[state=checked]:group-active:translate-x-3",
      )}
    />
  </SwitchPrimitives.Root>
));

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
