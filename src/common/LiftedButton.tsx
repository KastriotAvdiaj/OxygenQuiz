import React from "react";
import { cn } from "@/utils/cn";

export interface LiftedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "icon";
  backgroundColorForBorder?: string;
}

export const LiftedButton = React.forwardRef<
  HTMLButtonElement,
  LiftedButtonProps
>(
  (
    { children, className, disabled, backgroundColorForBorder, ...props },
    ref
  ) => {
    return (
      <>
        {props.variant === "icon" ? (
          <button
            className={cn("relative font-thin", className)}
            disabled={disabled}
            {...props}
            ref={ref}
          >
            <div
              className={cn(
                "absolute inset-x-[1.4px] h-full -bottom-[1.4px] -right-[1.4px] bg-foreground border border-foreground/20 rounded-xl",
                disabled && "opacity-50"
              )}
            ></div>
            <div
              className={cn(
                "relative bg-primary border border-foreground/20 rounded-xl py-2 px-2 transition transform duration-200 text-white",
                !disabled &&
                  "hover:translate-y-[-1px] active:translate-y-[1px] active:translate-x-[1px]",
                disabled && "opacity-50 cursor-not-allowed",
                className
              )}
            >
              {children}
            </div>
          </button>
        ) : (
          <button
            className="relative font-thin" // no className here
            disabled={disabled}
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
                disabled && "opacity-50"
              )}
            ></div>
            <div
              className={cn(
                "relative bg-primary flex items-center justify-center gap-2 border border-foreground/20 rounded-lg py-2 px-4 transition transform duration-200 text-white",
                !disabled &&
                  "hover:translate-y-[-2px] active:translate-y-[2px] active:translate-x-[2px]",
                disabled && "opacity-70",
                className
              )}
            >
              {children}
            </div>
          </button>
        )}
      </>
    );
  }
);

LiftedButton.displayName = "LiftedButton";
