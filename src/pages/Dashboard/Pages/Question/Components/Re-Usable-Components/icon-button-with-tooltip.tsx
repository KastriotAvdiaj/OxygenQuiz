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
  /**
   * Which side of the label the icon sits on. Defaults to `end`, which is where it has always
   * been — this component started out icon-only, so the label was appended in front of it
   * rather than the icon being placed after.
   *
   * Pass `start` in a row alongside plain `LiftedButton`s, which put their icon first: an
   * action row where one button mirrors the others reads as a different kind of control, which
   * is exactly the mismatch the quiz page had.
   */
  iconPosition?: "start" | "end";
}

export const IconButtonWithTooltip = React.forwardRef<
  HTMLButtonElement,
  IconButtonWithTooltipProps
>(
  (
    {
      icon,
      tooltip,
      variant = "icon",
      className,
      buttonText,
      iconPosition = "end",
      ...props
    },
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
              {iconPosition === "start" ? (
                <>
                  {icon}
                  {buttonText}
                </>
              ) : (
                <>
                  {buttonText}
                  {icon}
                </>
              )}
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
