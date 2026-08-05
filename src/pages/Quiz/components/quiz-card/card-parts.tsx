import { type CSSProperties, type ReactNode } from "react";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { cn } from "@/utils/cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * The rendered pieces of a quiz card.
 *
 * `quiz-card.tsx` owns layout — where the colour goes, what's emphasised, how the stats
 * read. The behavioural and accessibility-carrying pieces live here (the interactive frame,
 * the creator avatar, the difficulty meter) and the derived data lives in `card-model.ts`,
 * so a redesign of the layout can't quietly drop the focus ring or the contrast handling.
 */

/**
 * The interactive frame: a real `<button>`, so the card is keyboard-reachable and gets a
 * focus ring for free (it was a bare `div` with `onClick` before). The rounded corners and
 * `overflow-hidden` live here too, so the card's colour stripe clips to the app's radius
 * without the layout restating it.
 */
export function QuizCardFrame({
  quiz,
  accent,
  onAccent,
  onSelect,
  children,
}: {
  quiz: QuizSummaryDTO;
  accent: string;
  onAccent?: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  const accentVars = {
    "--accent": accent,
    ...(onAccent ? { "--on-accent": onAccent } : {}),
  } as CSSProperties;

  return (
    <button
      type="button"
      onClick={onSelect}
      style={accentVars}
      aria-label={`${quiz.title} — ${quiz.category}, ${quiz.difficulty}, ${quiz.questionCount} ${quiz.questionCount === 1 ? "question" : "questions"}`}
      className={cn(
        "group h-full w-full cursor-pointer text-left font-app",
        "rounded-xl focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card",
          "transition-all duration-300 ease-out",
          "hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-lg"
        )}
      >
        {children}
      </div>
    </button>
  );
}

/**
 * The quiz creator: a round avatar in the corner of the card, revealing the full name on
 * hover.
 *
 * No fill of its own — just a muted hairline. A solid background would compete with the
 * palette stripe for attention, and it would box in creator photos that already have their
 * own backdrop. The ring is `border-border`, the same hairline as the card itself, so the
 * avatar reads as part of the card rather than as a badge stuck on it.
 */
export function CreatorAvatar({
  name,
  imageUrl,
  initials,
  className,
}: {
  name?: string;
  imageUrl?: string;
  initials: string;
  className?: string;
}) {
  return (
    <div className="group/author relative shrink-0">
      <Avatar
        className={cn("h-6 w-6 rounded-full border border-border", className)}
      >
        <AvatarImage
          src={imageUrl}
          alt={name}
          className="rounded-full"
          loading="lazy"
          decoding="async"
        />
        <AvatarFallback className="rounded-full bg-transparent text-[10px] font-bold text-muted-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="pointer-events-none absolute right-0 top-full z-20 mt-1.5 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity duration-200 group-hover/author:opacity-100">
        {name}
      </span>
    </div>
  );
}

/**
 * Difficulty as three filled bars — a meter reads faster than a word at card size.
 * Falls back to the raw label when the difficulty isn't one of easy/medium/hard, so an
 * unexpected value from the API shows up rather than silently rendering an empty meter.
 */
export function DifficultyMeter({
  difficulty,
  rank,
  accent,
}: {
  difficulty: string;
  rank: 1 | 2 | 3 | null;
  accent: string;
}) {
  if (rank === null) {
    return (
      <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
        {difficulty}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-[3px]" title={difficulty}>
      {[1, 2, 3].map((step) => {
        const filled = step <= rank;
        return (
          <span
            key={step}
            // Unfilled steps take a neutral theme colour rather than a tint of the
            // palette, so the meter reads as "2 of 3" instead of as two brand colours.
            className={cn("h-3 w-[5px] rounded-[1px]", !filled && "bg-muted")}
            style={filled ? { backgroundColor: accent } : undefined}
          />
        );
      })}
    </span>
  );
}
