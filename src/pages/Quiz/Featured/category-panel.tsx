import type { CSSProperties } from "react";
import { cn } from "@/utils/cn";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { parseQuizPalette, quizEdgeColor } from "../components/quiz-palette";
import type { CategoryPanelSpec, FeaturedSlot } from "./featured-catalogue";
import { FEATURED_LEVELS } from "./featured-catalogue";

/**
 * One category on the quiz home page: its name, then a card of the category's photo holding its
 * Easy → Expert ladder (docs/quiz/featured-quizzes.md, "The panel").
 *
 * No font is set anywhere here: the page inherits the player's chosen quiz font (`font-quiz` on
 * the layout, DynaPuff by default), like every other play screen.
 *
 * `slots` is undefined while the quizzes load — the panel still draws, with placeholder tiles, so
 * the page doesn't jump when they arrive.
 */
export function CategoryPanel({
  panel,
  slots,
  onPick,
}: {
  panel: CategoryPanelSpec;
  slots?: FeaturedSlot[];
  onPick: (quiz: QuizSummaryDTO) => void;
}) {
  // The category's own palette, so an admin's change to it reaches the panel too; the spec's copy
  // only covers the moment before the quizzes load.
  const [main, light] = slots?.[0]
    ? parseQuizPalette(slots[0].quiz.colorPaletteJson)
    : panel.fallbackPalette;
  const colours = {
    "--panel": main,
    "--panel-light": light ?? panel.fallbackPalette[1],
    "--panel-edge": quizEdgeColor(main),
  } as CSSProperties;

  return (
    <section aria-labelledby={`panel-${panel.slug}`} style={colours}>
      <h2
        id={`panel-${panel.slug}`}
        className="mb-2.5 flex items-center gap-2.5 text-xl font-bold sm:mb-3 sm:text-2xl"
      >
        <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-[4px] bg-[var(--panel)]" />
        {panel.name}
      </h2>

      <div className="relative overflow-hidden rounded-2xl shadow-[0_6px_0_var(--panel-edge)]">
        {/* The photo, softened so it reads as a backdrop: a light blur, a little less colour.
            Inset past the edges because a blur fades its own border. */}
        <div
          aria-hidden="true"
          className="absolute -inset-2 scale-[1.03] bg-cover blur-[2px] saturate-[.85] brightness-[.92]"
          style={{ backgroundImage: `url(${panel.image})`, backgroundPosition: panel.imagePosition }}
        />
        {/* Clear at the top so the photo shows, the category colour behind the tiles. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--panel) 10%, transparent) 0%, color-mix(in srgb, var(--panel) 15%, transparent) 30%, color-mix(in srgb, var(--panel) 80%, transparent) 72%, color-mix(in srgb, var(--panel) 92%, #000 8%) 100%)",
          }}
        />

        <ul className="relative grid grid-cols-2 gap-2.5 px-3 pb-3 pt-20 sm:grid-cols-4 sm:gap-3 sm:px-5 sm:pb-5 sm:pt-28">
          {slots
            ? slots.map((slot) => (
                <li key={slot.level.level}>
                  <FeaturedTile slot={slot} onPick={onPick} />
                </li>
              ))
            : FEATURED_LEVELS.map((level) => (
                <li key={level.level} aria-hidden="true">
                  <div className="h-[92px] animate-pulse rounded-xl bg-background/60 sm:h-[110px]" />
                </li>
              ))}
        </ul>
      </div>
    </section>
  );
}

function FeaturedTile({ slot, onPick }: { slot: FeaturedSlot; onPick: (quiz: QuizSummaryDTO) => void }) {
  const { level, quiz } = slot;
  return (
    <button
      type="button"
      onClick={() => onPick(quiz)}
      aria-label={`${quiz.title}, ${level.label}, ${quiz.questionCount} questions`}
      className="group flex h-full min-h-[92px] w-full flex-col gap-1.5 rounded-xl bg-background/90 p-3 text-left text-foreground shadow-[0_4px_0_var(--panel-edge)] backdrop-blur-sm transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)] active:translate-y-0.5 active:shadow-[0_1px_0_var(--panel-edge)] sm:min-h-[110px] sm:p-3.5 dark:bg-background/85"
    >
      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--panel)] dark:text-[var(--panel-light)] sm:text-xs">
        <DifficultyPips rank={level.rank} />
        {level.label}
      </span>
      <span className="text-[15px] font-bold leading-tight sm:text-lg">{quiz.title}</span>
      <span className="mt-auto text-xs text-muted-foreground">{quiz.questionCount} questions</span>
    </button>
  );
}

/** Four small squares, filled up to the level — the ladder at a glance. */
function DifficultyPips({ rank }: { rank: number }) {
  return (
    <span className="flex gap-[3px]" aria-hidden="true">
      {FEATURED_LEVELS.map((l) => (
        <span
          key={l.level}
          className={cn(
            "h-2 w-2 rounded-[2px]",
            l.rank <= rank
              ? "bg-[var(--panel)] dark:bg-[var(--panel-light)]"
              : "bg-[color-mix(in_srgb,var(--panel)_22%,transparent)] dark:bg-[color-mix(in_srgb,var(--panel-light)_28%,transparent)]"
          )}
        />
      ))}
    </span>
  );
}
