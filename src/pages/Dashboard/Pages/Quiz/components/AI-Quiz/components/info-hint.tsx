import type { ReactNode } from "react";
import { Info } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utils/cn";

export interface InfoHintProps {
  /** Announced to screen readers, and shown as the native title on hover. */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * An <b>ⓘ</b> beside a heading, holding the "why" a screen doesn't need in its face.
 *
 * <b>A Popover, not a Tooltip.</b> They look the same and this is the one place the
 * difference bites: Radix's Tooltip opens on hover and keyboard focus and deliberately does
 * **not** open on tap, because a tooltip is a hover affordance. On a phone the content would
 * simply be unreachable — and what this holds is the only explanation of what the own-AI page
 * is for. Decorative hints can be tooltips; an explanation that a third of your users cannot
 * open is not an explanation (docs/RESPONSIVE.md). A Popover opens on click, tap and Enter,
 * closes on Escape or an outside click, and manages focus.
 *
 * The trigger is `h-9 w-9` rather than icon-sized, because the icon is 16px and
 * docs/RESPONSIVE.md asks ≥36px of anything you tap. The circle is what you press; the glyph
 * inside it is just the label.
 */
export const InfoHint = ({ label, children, className }: InfoHintProps) => (
  <Popover>
    <PopoverTrigger
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <Info className="h-4 w-4" />
    </PopoverTrigger>
    <PopoverContent
      align="start"
      className="max-w-xs text-sm text-muted-foreground"
    >
      {children}
    </PopoverContent>
  </Popover>
);
