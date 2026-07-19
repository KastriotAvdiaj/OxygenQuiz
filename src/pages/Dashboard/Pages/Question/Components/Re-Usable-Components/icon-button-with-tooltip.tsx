import React from "react";
import { LiftedButton, type LiftedButtonProps } from "@/common/LiftedButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";

// Extends LiftedButtonProps so every lift option (liftColor, outerClassName,
// isPending, …) passes straight through to the underlying LiftedButton.
export interface IconButtonWithTooltipProps
  extends Omit<LiftedButtonProps, "children"> {
  icon: React.ReactNode;
  tooltip: string;
  buttonText?: string;
}

export const IconButtonWithTooltip = React.forwardRef<
  HTMLButtonElement,
  IconButtonWithTooltipProps
>(
  (
    { icon, tooltip, variant = "icon", className, buttonText, ...props },
    ref
  ) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <LiftedButton
              ref={ref}
              variant={variant}
              className={cn(className)}
              {...props}>
              {buttonText}
              {icon}
            </LiftedButton>
          </TooltipTrigger>
          <TooltipContent className="bg-background border-foreground/50">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

IconButtonWithTooltip.displayName = "IconButtonWithTooltip";
