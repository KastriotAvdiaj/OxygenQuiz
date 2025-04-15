import React from "react";
import { cn } from "@/utils/cn";

export interface LiftedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export const LiftedButton = React.forwardRef<
  HTMLButtonElement,
  LiftedButtonProps
>(({ children, className, ...props }, ref) => {
  return (
    <>
      <button className={cn("relative font-thin")} {...props} ref={ref}>
        <div className="absolute inset-x-[2px] h-full -bottom-[2px] -right-[2px] bg-foreground border border-foreground/20 rounded-xl"></div>
        <div className="relative bg-primary border border-foreground/20 rounded-lg py-2 px-4 transition trasnform duration-200 hover:translate-y-[-2px] active:translate-y-[2px] active:translate-x-[2px] text-white">
          {children}
        </div>
      </button>
    </>
  );
});

LiftedButton.displayName = "LiftedButton";
