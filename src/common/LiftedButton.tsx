import React from "react";
import { cn } from "@/utils/cn";
import { Loader2 } from "lucide-react";

/**
 * Semantic theme tokens accepted by `liftColor`. Each resolves to the matching
 * `hsl(var(--token))` CSS variable (defined in src/global.css / tailwind.config.js), so a
 * caller can write `liftColor="destructive"` instead of `hsl(var(--destructive))`.
 */
export const LIFT_COLOR_TOKENS = [
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "foreground",
  "foreground-lighter",
  "background",
  "border",
  "ring",
] as const;

export type LiftColorToken = (typeof LIFT_COLOR_TOKENS)[number];

/**
 * Resolve a `liftColor` prop to a concrete CSS color:
 * - a known theme token (e.g. "primary", "foreground") → `hsl(var(--token))`
 * - any other string (hex, rgb(), hsl(), a raw `var(--x)`) → passed through unchanged
 * - `undefined` → the theme primary
 */
const resolveLiftColor = (
  liftColor?: LiftColorToken | (string & {}),
): string => {
  if (!liftColor) return "hsl(var(--primary))";
  return (LIFT_COLOR_TOKENS as readonly string[]).includes(liftColor)
    ? `hsl(var(--${liftColor}))`
    : liftColor;
};

export interface LiftedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string; // Applied to the front (visible face)
  outerClassName?: string; // Applied to the outer button element (layout)
  variant?: "default" | "icon";
  backgroundColorForBorder?: string; // Applied to the edge layer
  isPending?: boolean;
  /**
   * Base color for the 3D depth layers (edge gradient + drop shadow). Accepts either a
   * semantic theme token — "primary", "foreground", "destructive", … (see
   * {@link LIFT_COLOR_TOKENS}) — or any raw CSS color, e.g. "#7c3aed" or
   * "hsl(var(--muted-foreground))". Defaults to the theme primary; pass this when the front
   * face isn't primary-colored so the button doesn't sit on a blue backdrop.
   */
  liftColor?: LiftColorToken | (string & {});
}

// 3D "pushable" button: shadow (blurred, drops on press), edge (darker
// gradient, gives depth), front (colored face that lifts). The depth layers
// derive from --lift-base, which defaults to the theme's --primary and can be
// overridden per-button via the `liftColor` prop.

// Timing uses arbitrary properties (transition-duration / -timing-function
// in square-bracket form): the equivalent duration/ease arbitrary-value
// utilities are ambiguous to Tailwind, which then generates nothing for them.
const springOut =
  "[transition-timing-function:cubic-bezier(0.3,0.7,0.4,1)]";
const springHover =
  "group-hover:[transition-duration:250ms] group-hover:[transition-timing-function:cubic-bezier(0.3,0.7,0.4,1.5)]";
const snapActive = "group-active:[transition-duration:34ms]";

const edgeGradient =
  "[background:linear-gradient(to_right,color-mix(in_srgb,var(--lift-base),black_35%)_0%,color-mix(in_srgb,var(--lift-base),black_18%)_8%,color-mix(in_srgb,var(--lift-base),black_35%)_92%,color-mix(in_srgb,var(--lift-base),black_50%)_100%)]";

const shadowFill =
  "[background:color-mix(in_srgb,var(--lift-base),transparent_60%)]";

export const LiftedButton = React.forwardRef<
  HTMLButtonElement,
  LiftedButtonProps
>(
  (
    {
      children,
      className,
      outerClassName,
      disabled,
      backgroundColorForBorder,
      isPending,
      liftColor,
      variant = "default",
      style,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isPending;
    const isIcon = variant === "icon";
    const rounded = isIcon ? "rounded-xl" : "rounded-lg";

    // Lift distances (px): icon variant is subtler than default
    const front = isIcon
      ? {
          rest: "-translate-y-[3px]",
          hover: "group-hover:-translate-y-[4px]",
          active: "group-active:-translate-y-[1px]",
        }
      : {
          rest: "-translate-y-1",
          hover: "group-hover:-translate-y-1.5",
          active: "group-active:-translate-y-0.5",
        };
    const shadow = isIcon
      ? {
          rest: "translate-y-[1.5px]",
          hover: "group-hover:translate-y-[3px]",
          active: "group-active:translate-y-[1px]",
        }
      : {
          rest: "translate-y-[2px]",
          hover: "group-hover:translate-y-1",
          active: "group-active:translate-y-[1px]",
        };

    return (
      <button
        className={cn(
          "group relative border-none bg-transparent p-0 font-thin outline-offset-4 transition-[filter] [transition-duration:250ms]",
          "focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
          // brightness-110 reads as a "shine" — keep it in light mode only
          !isDisabled && "cursor-pointer hover:brightness-110 dark:hover:brightness-100",
          isDisabled && "cursor-not-allowed",
          outerClassName
        )}
        disabled={isDisabled}
        style={
          {
            "--lift-base": resolveLiftColor(liftColor),
            ...style,
          } as React.CSSProperties
        }
        {...props}
        ref={ref}
      >
        {/* Shadow — colored in light mode; in dark mode a colored blur reads
            as a glow halo, so it falls back to a plain translucent black. */}
        <span
          className={cn(
            "absolute inset-0 blur-[2px] will-change-transform",
            shadowFill,
            "dark:[background:rgb(0_0_0/0.45)]",
            rounded,
            shadow.rest,
            `transition-transform [transition-duration:600ms] ${springOut}`,
            !isDisabled && cn(shadow.hover, shadow.active, springHover, snapActive),
            isDisabled && "opacity-50"
          )}
        />
        {/* Edge */}
        <span
          className={cn(
            "absolute inset-0",
            rounded,
            backgroundColorForBorder ? backgroundColorForBorder : edgeGradient,
            isDisabled && "opacity-50"
          )}
        />
        {/* Front */}
        <span
          className={cn(
            "relative flex items-center justify-center gap-2 bg-primary text-white will-change-transform",
            rounded,
            isIcon ? "p-2" : "py-2 px-4",
            front.rest,
            `transition-transform [transition-duration:600ms] ${springOut}`,
            !isDisabled && cn(front.hover, front.active, springHover, snapActive),
            isDisabled && "opacity-70",
            className
          )}
        >
          {isPending && isIcon ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {children}
            </>
          )}
        </span>
      </button>
    );
  }
);

LiftedButton.displayName = "LiftedButton";
