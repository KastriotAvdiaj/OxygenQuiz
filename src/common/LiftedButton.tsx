import React from "react";
import { cn } from "@/utils/cn";
import { Loader2 } from "lucide-react";

export interface LiftedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string; // Applied to the inner visual element (face)
  outerClassName?: string; // Applied to the outer button element (layout)
  variant?: "default" | "icon";
  backgroundColorForBorder?: string;
  isPending?: boolean;
}

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
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isPending;
    
    return (
      <>
        {props.variant === "icon" ? (
          <button
            className={cn("relative font-thin", outerClassName)}
            disabled={isDisabled}
            {...props}
            ref={ref}
          >
            <div
              className={cn(
                "absolute inset-x-[1.4px] h-full -bottom-[1.4px] -right-[1.4px] bg-foreground border border-foreground/20 rounded-xl",
                isDisabled && "opacity-50"
              )}
            ></div>
            <div
              className={cn(
                "relative bg-primary border border-foreground/20 rounded-xl py-2 px-2 transition transform duration-200 text-white flex items-center justify-center",
                !isDisabled &&
                  "hover:translate-y-[-1px] active:translate-y-[1px] active:translate-x-[1px]",
                isDisabled && "opacity-50 cursor-not-allowed",
                className
              )}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                children
              )}
            </div>
          </button>
        ) : (
          <button
            className={cn("relative font-thin", outerClassName)}
            disabled={isDisabled}
            {...props}
            ref={ref}
          >
            <div
              className={cn(
                `absolute inset-x-[2px] h-full -bottom-[2px] -right-[2px] ${
                  backgroundColorForBorder
                    ? backgroundColorForBorder
                    : "bg-foreground"
                } border border-foreground/20 rounded-lg`,
                isDisabled && "opacity-50"
              )}
            ></div>
            <div
              className={cn(
                "relative bg-primary flex items-center justify-center gap-2 border border-foreground/20 rounded-lg py-2 px-4 transition transform duration-200 text-white",
                !isDisabled &&
                  "hover:translate-y-[-2px] active:translate-y-[2px] active:translate-x-[2px]",
                isDisabled && "opacity-70",
                className
              )}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {children}
            </div>
          </button>
        )}
      </>
    );
  }
);

LiftedButton.displayName = "LiftedButton";