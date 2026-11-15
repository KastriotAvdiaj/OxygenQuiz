import type { ReactNode } from "react";
import { Info } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utils/cn";

export interface InfoHintProps {
  /**
   * Announced to screen readers. Not also a `title`: the browser showed it as its own grey
   * tooltip on hover, a second, different popup before ours opened on click (removed 2026-11-15).
   */
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
 * docs/RESPONSIVE.md asks ≥36px of anything you tap. The hover circle is only icon-sized; the
 * target around it is invisible.
 */
export const InfoHint = ({ label, children, className }: InfoHintProps) => (
  <Popover>
    <PopoverTrigger
      type="button"
      aria-label={label}
      className={cn(
        "group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors",
        "hover:text-foreground focus-visible:outline-none",
        className
      )}
    >
      {/* The hover and focus circle is drawn round the icon, not the 36px target: painted on
          the whole target it was twice the glyph's size and loomed over a small label. */}
      <span className="inline-flex rounded-full p-1 transition-colors group-hover:bg-muted group-focus-visible:ring-2 group-focus-visible:ring-primary">
        <Info className="h-4 w-4" />
      </span>
    </PopoverTrigger>
    <PopoverContent
      align="start"
      className="max-w-xs text-sm text-muted-foreground"
    >
      {children}
    </PopoverContent>
  </Popover>
);
