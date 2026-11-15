import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, type LucideIcon } from "lucide-react";

import { cn } from "@/utils/cn";

export interface ReviewChip {
  id: string;
  icon: LucideIcon;
  /** A few words: what it is, at a glance. */
  label: string;
  /** The rest, shown when the chip is opened. */
  detail: ReactNode;
  /**
   * Not routine: `problem` (red) for what the parser dropped or changed, `caution` (amber) for a
   * quiz written from memory because a source was down. Unset is plain information.
   */
  tone?: "problem" | "caution";
}

// Whole class strings per tone: Tailwind only generates what it can read verbatim.
const CHIP = {
  info: "border-primary/30 bg-primary/5 hover:bg-primary/10",
  infoOpen: "border-primary/60 bg-primary/10",
  problem: "border-destructive/40 bg-destructive/5 hover:bg-destructive/10",
  problemOpen: "border-destructive/70 bg-destructive/10",
  caution: "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10",
  cautionOpen: "border-amber-500/70 bg-amber-500/10",
} as const;
const ICON = {
  info: "text-primary",
  problem: "text-destructive",
  caution: "text-amber-600 dark:text-amber-500",
} as const;
const PANEL = {
  info: "border-primary/30 bg-primary/5",
  problem: "border-destructive/40 bg-destructive/5",
  caution: "border-amber-500/40 bg-amber-500/5",
} as const;

/**
 * The routine facts about a generated quiz — what it was written from, how many pictures were
 * added — as one row of small chips above the review. A chip opens a panel with the rest (the
 * article links, which questions got no picture) and closes again.
 *
 * These were full-width boxes until 2026-11-15. Two of them appear on nearly every quiz and say
 * nothing the author must act on, so they cost a fifth of the first screen to say "all is as
 * usual". What does need a look — questions the parser dropped, a source that was down — is a
 * chip in the same row, told apart by colour (`tone`) and by coming first.
 * See docs/quiz/quiz-overview.md, "Review notices".
 *
 * One panel at a time, and it opens in the page rather than over it: the links inside are each
 * article's attribution, and a list of twelve of them is easier read in place than in a popover.
 *
 * A plain `<button>`, not a `LiftedButton`: this is a disclosure toggle on a line of status, in
 * the same family as a card's "Reveal answer" — not an action the author takes on the quiz.
 */
export const ReviewChips = ({ items }: { items: ReviewChip[] }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  if (items.length === 0) return null;
  const open = items.find((item) => item.id === openId);

  return (
    <div role="status" className="mx-auto w-full max-w-[1600px]">
      <div className="flex flex-wrap items-center gap-2">
        {items.map(({ id, icon: Icon, label, tone = "info" }) => {
          const isOpen = id === openId;
          return (
            <button
              key={id}
              type="button"
              aria-expanded={isOpen}
              aria-controls={`review-chip-${id}`}
              onClick={() => setOpenId(isOpen ? null : id)}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200",
                isOpen ? CHIP[`${tone}Open`] : CHIP[tone],
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 shrink-0", ICON[tone])} aria-hidden="true" />
              <span className="truncate">{label}</span>
              <ChevronDown
                className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200", isOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
      <AnimatePresence initial={false} mode="wait">
        {open && (
          <motion.div
            key={open.id}
            id={`review-chip-${open.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="overflow-hidden"
          >
            <div className={cn("mt-2 rounded-lg border px-4 py-3 text-sm", PANEL[open.tone ?? "info"])}>
              {open.detail}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
