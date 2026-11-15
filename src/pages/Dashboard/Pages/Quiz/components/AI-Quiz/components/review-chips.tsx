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
}

/**
 * The routine facts about a generated quiz — what it was written from, how many pictures were
 * added — as one row of small chips above the review. A chip opens a panel with the rest (the
 * article links, which questions got no picture) and closes again.
 *
 * These were two full-width boxes until 2026-11-15. They appear on nearly every quiz and say
 * nothing the author must act on, so they cost a fifth of the first screen to say "all is as
 * usual". A box is kept for what does need acting on: a source that was down (`SourceNote`),
 * questions that were dropped (`ImportNotices`). See docs/quiz/quiz-overview.md, "Review notices".
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
        {items.map(({ id, icon: Icon, label }) => {
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
                isOpen
                  ? "border-primary/60 bg-primary/10"
                  : "border-primary/30 bg-primary/5 hover:bg-primary/10",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
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
            <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
              {open.detail}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
