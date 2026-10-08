import { useCallback, useState, type CSSProperties } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/utils/cn";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { parseQuizPalette, quizEdgeColor } from "../components/quiz-palette";
import type { CategoryPanelSpec, FeaturedSlot } from "./featured-catalogue";
import { FEATURED_LEVELS } from "./featured-catalogue";

/**
 * One category on the quiz home page: a card of the category's photo with its name in 3D letters
 * and its Easy → Expert ladder in the middle (docs/quiz/featured-quizzes.md, "The panel").
 *
 * No font is set anywhere here: the page inherits the player's chosen quiz font (`font-quiz` on
 * the layout, DynaPuff by default), like every other play screen — the 3D is a text-shadow, so it
 * works with whichever font that is.
 *
 * `slots` is undefined while the quizzes load — the panel still draws, with placeholder tiles, so
 * the page doesn't jump when they arrive.
 */

/** The panel rises in; its children follow one after another (orchestrated by the page). */
const panelVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  shown: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
      when: "beforeChildren",
      staggerChildren: 0.06,
    },
  },
};

const titleVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  shown: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  shown: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 28 },
  },
};

/**
 * Extruded letters: a stack of 1px shadows in the category's darker edge colour, then a soft drop
 * shadow, so white text reads on any part of the photo.
 */
const TITLE_3D: CSSProperties = {
  textShadow: [
    "0 1px 0 var(--panel-edge)",
    "0 2px 0 var(--panel-edge)",
    "0 3px 0 var(--panel-edge)",
    "0 4px 0 var(--panel-edge)",
    "0 5px 0 var(--panel-edge)",
    "0 7px 10px rgba(0,0,0,.35)",
  ].join(", "),
};

export function CategoryPanel({
  panel,
  slots,
  onPick,
  priority = false,
}: {
  panel: CategoryPanelSpec;
  slots?: FeaturedSlot[];
  onPick: (quiz: QuizSummaryDTO) => void;
  /** The first panel's photo is above the fold: fetch it first instead of lazily. */
  priority?: boolean;
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

  // The photo fades in once it has actually arrived, rather than painting in strips.
  const [photoLoaded, setPhotoLoaded] = useState(false);
  // A cached photo can finish before React attaches onLoad; the ref catches that case.
  const photoRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) setPhotoLoaded(true);
  }, []);

  return (
    <motion.section
      aria-labelledby={`panel-${panel.slug}`}
      style={colours}
      variants={panelVariants}
      className="relative isolate overflow-hidden rounded-2xl bg-[var(--panel)] shadow-[0_6px_0_var(--panel-edge)]"
    >
      <img
        ref={photoRef}
        src={panel.image}
        srcSet={`${panel.imageSmall} 800w, ${panel.image} 1600w`}
        sizes="(min-width: 1152px) 1104px, 100vw"
        alt=""
        aria-hidden="true"
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        {...(priority ? { fetchpriority: "high" } : {})}
        onLoad={() => setPhotoLoaded(true)}
        className={cn(
          "absolute inset-0 -z-10 h-full w-full object-cover saturate-[.9] transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
          photoLoaded ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
        )}
        style={{ objectPosition: panel.imagePosition }}
      />
      {/* The category colour only at the edges — a glow round the frame, the photo clean inside. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-2xl"
        style={{
          boxShadow:
            "inset 0 0 48px 6px color-mix(in srgb, var(--panel) 75%, transparent)",
        }}
      />

      {/* Title and tiles as one block, centred with equal photo above and below. */}
      <div className="px-3 py-8 sm:px-5 sm:py-12">
        <motion.h2
          id={`panel-${panel.slug}`}
          variants={titleVariants}
          className="mb-4 text-3xl font-bold leading-none tracking-wide text-white sm:mb-5 sm:text-5xl"
          style={TITLE_3D}
        >
          {panel.name}
        </motion.h2>

        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {slots
            ? slots.map((slot) => (
                <motion.li key={slot.level.level} variants={tileVariants}>
                  <FeaturedTile slot={slot} onPick={onPick} />
                </motion.li>
              ))
            : FEATURED_LEVELS.map((level) => (
                <li key={level.level} aria-hidden="true">
                  <div className="h-[92px] animate-pulse rounded-xl bg-background/60 sm:h-[110px]" />
                </li>
              ))}
        </ul>
      </div>
    </motion.section>
  );
}

/** A solid tile on the photo — no transparency, so the text never competes with the picture. */
function FeaturedTile({
  slot,
  onPick,
}: {
  slot: FeaturedSlot;
  onPick: (quiz: QuizSummaryDTO) => void;
}) {
  const { level, quiz } = slot;
  return (
    <button
      type="button"
      onClick={() => onPick(quiz)}
      aria-label={`${quiz.title}, ${level.label}, ${quiz.questionCount} questions`}
      className="group flex h-full min-h-[92px] w-full flex-col gap-1.5 rounded-xl bg-background p-3 text-left text-foreground shadow-[0_4px_0_var(--panel-edge)] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)] active:translate-y-0.5 active:shadow-[0_1px_0_var(--panel-edge)] sm:min-h-[110px] sm:p-3.5"
    >
      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--panel)] dark:text-[var(--panel-light)] sm:text-xs">
        <DifficultyPips rank={level.rank} />
        {level.label}
      </span>
      <span className="text-[15px] font-bold leading-tight sm:text-lg">
        {quiz.title}
      </span>
      <span className="mt-auto text-xs text-muted-foreground">
        {quiz.questionCount} questions
      </span>
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
              : "bg-[color-mix(in_srgb,var(--panel)_22%,transparent)] dark:bg-[color-mix(in_srgb,var(--panel-light)_28%,transparent)]",
          )}
        />
      ))}
    </span>
  );
}
