import React from "react";
import { cn } from "@/utils/cn";
import { Loader2 } from "lucide-react";

export interface LiftedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string; // Applied to the front (visible face)
  outerClassName?: string; // Applied to the outer button element (layout)
  variant?: "default" | "icon";
  backgroundColorForBorder?: string; // Applied to the edge layer
  isPending?: boolean;
}

// 3D "pushable" button: shadow (blurred, drops on press), edge (darker
// primary gradient, gives depth), front (primary-colored face that lifts).
// All colors derive from the theme's --primary variable.

// Timing uses arbitrary properties (transition-duration / -timing-function
// in square-bracket form): the equivalent duration/ease arbitrary-value
// utilities are ambiguous to Tailwind, which then generates nothing for them.
const springOut =
  "[transition-timing-function:cubic-bezier(0.3,0.7,0.4,1)]";
const springHover =
  "group-hover:[transition-duration:250ms] group-hover:[transition-timing-function:cubic-bezier(0.3,0.7,0.4,1.5)]";
const snapActive = "group-active:[transition-duration:34ms]";

const edgeGradient =
  "[background:linear-gradient(to_right,color-mix(in_srgb,hsl(var(--primary)),black_35%)_0%,color-mix(in_srgb,hsl(var(--primary)),black_18%)_8%,color-mix(in_srgb,hsl(var(--primary)),black_35%)_92%,color-mix(in_srgb,hsl(var(--primary)),black_50%)_100%)]";

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
      variant = "default",
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
          !isDisabled && "cursor-pointer hover:brightness-110",
          isDisabled && "cursor-not-allowed",
          outerClassName
        )}
        disabled={isDisabled}
        {...props}
        ref={ref}
      >
        {/* Shadow */}
        <span
          className={cn(
            "absolute inset-0 bg-primary/40 blur-[2px] will-change-transform",
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
