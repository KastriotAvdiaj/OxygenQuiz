import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";

export type SegmentedOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
  /**
   * Why this option can't be picked. Supplying it both disables the segment and explains itself
   * on hover and focus — a greyed-out control with no reason attached is only marginally better
   * than one that silently does nothing.
   *
   * It uses `aria-disabled` rather than the `disabled` attribute, because a truly disabled button
   * receives no pointer events and so can never show a tooltip. The click is blocked in the
   * handler instead, and the segment stays keyboard-reachable so the reason is available to
   * someone who isn't using a mouse.
   */
  disabledReason?: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  "aria-label"?: string;
};

/**
 * Compact inline choice between a few options (radiogroup semantics).
 * Muted track with a raised white "active" segment — the professional
 * counterpart to a dropdown when there are only 2–3 choices.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const blocked = opt.disabled || opt.disabledReason !== undefined;

        const segment = (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            // `disabled` only when there is nothing to explain — see `disabledReason`.
            disabled={opt.disabled && opt.disabledReason === undefined}
            aria-disabled={blocked || undefined}
            onClick={() => !active && !blocked && onValueChange(opt.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-default disabled:opacity-50",
              blocked && "cursor-default opacity-50",
              active
                ? "bg-background font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );

        if (opt.disabledReason === undefined) return segment;

        return (
          <TooltipProvider key={opt.value}>
            <Tooltip>
              <TooltipTrigger asChild>{segment}</TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {opt.disabledReason}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}
