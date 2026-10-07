import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/utils/cn";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { parseQuizPalette, quizEdgeColor } from "../components/quiz-palette";
import type { CategoryPanelSpec, FeaturedSlot } from "./featured-catalogue";
import { FEATURED_LEVELS } from "./featured-catalogue";
import { panelPath } from "./panel-shape";

/** Below this panel width the tab gets smaller and the tiles go 2×2 (sm: in Tailwind). */
const NARROW = 640;

type Size = { width: number; height: number };

/**
 * One category on the quiz home page: the category's photo, cut to a card with a tab, holding its
 * Easy → Expert ladder (docs/quiz/featured-quizzes.md, "The panel shape").
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
  const size = useElementSize<HTMLDivElement>();
  const narrow = (size.value?.width ?? NARROW) < NARROW;
  const tabWidth = narrow ? Math.min(230, (size.value?.width ?? 0) * 0.66) : 300;
  const tabHeight = narrow ? 44 : 52;

  // The category's own palette, so an admin's change to it reaches the panel too; the spec's copy
  // only covers the moment before the quizzes load.
  const [main, light] = slots?.[0]
    ? parseQuizPalette(slots[0].quiz.colorPaletteJson)
    : panel.fallbackPalette;
  const colours = {
    "--panel": main,
    "--panel-light": light ?? panel.fallbackPalette[1],
    "--panel-edge": quizEdgeColor(main),
    "--tab-h": `${tabHeight}px`,
    "--tab-w": `${tabWidth}px`,
  } as CSSProperties;

  // `path()` is in pixels, so the outline waits for the first measurement; until then the panel
  // is invisible rather than briefly a plain rectangle.
  const clip = size.value
    ? `path("${panelPath({ ...size.value, tabWidth, tabHeight, radius: narrow ? 14 : 18 })}")`
    : undefined;

  return (
    <section
      aria-labelledby={`panel-${panel.slug}`}
      // drop-shadow, not box-shadow: a clip-path cuts a box-shadow off with the corners it clips.
      className="drop-shadow-[0_10px_16px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_10px_16px_rgba(0,0,0,0.5)]"
      style={colours}
    >
      <div
        ref={size.ref}
        className={cn(
          "relative overflow-hidden transition-opacity duration-300",
          clip ? "opacity-100" : "opacity-0"
        )}
        style={{ clipPath: clip }}
      >
        {/* The photo, softened so it reads as a backdrop: a light blur, a little less colour.
            Inset past the edges because a blur fades its own border. */}
        <div
          aria-hidden="true"
          className="absolute -inset-2 scale-[1.03] bg-cover blur-[2px] saturate-[.85] brightness-[.92]"
          style={{ backgroundImage: `url(${panel.image})`, backgroundPosition: panel.imagePosition }}
        />
        {/* One scrim over the whole shape, tab included, so there is no seam where the tab meets
            the body: the category colour behind the name at the very top, clear through the middle
            so the photo shows, and the colour again behind the tiles. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--panel) 60%, transparent) 0, color-mix(in srgb, var(--panel) 12%, transparent) calc(var(--tab-h) * 1.6), color-mix(in srgb, var(--panel) 12%, transparent) 40%, color-mix(in srgb, var(--panel) 80%, transparent) 75%, color-mix(in srgb, var(--panel) 92%, #000 8%) 100%)",
          }}
        />

        {/* The tab: the category's name, on the scrim's coloured top band. */}
        <h2
          id={`panel-${panel.slug}`}
          className="absolute right-0 top-0 flex h-[var(--tab-h)] w-[var(--tab-w)] items-center justify-center px-3 text-center font-header text-lg font-black leading-tight tracking-wide text-white [text-shadow:0_1px_8px_rgba(0,0,0,.55)] sm:text-2xl"
        >
          {panel.name}
        </h2>

        <ul className="relative grid grid-cols-2 gap-2.5 px-3 pb-3 pt-[calc(var(--tab-h)+4.5rem)] sm:grid-cols-4 sm:gap-3 sm:px-5 sm:pb-5 sm:pt-[calc(var(--tab-h)+7rem)]">
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
      <span className="font-header text-[15px] font-bold leading-tight sm:text-lg">{quiz.title}</span>
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

/**
 * The element's size, kept current with a ResizeObserver — the clip path is in pixels and has to
 * follow the panel as the window (or the tiles' wrapping) changes it.
 */
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [value, setValue] = useState<Size | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      setValue((prev) =>
        prev && Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
          ? prev
          : { width, height }
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, value };
}
