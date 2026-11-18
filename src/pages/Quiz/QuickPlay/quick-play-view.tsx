import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, RefreshCw, RotateCcw } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import { cn } from "@/utils/cn";

import { QUICK_PLAY_SKY, QuickPlayBackdrop, QuickPlayHill } from "./quick-play-scene";
import type { QuickPlayTile } from "./quick-play-model";

export interface QuickPlayViewProps {
  /** The categories that have a quiz to hand out. Empty: nothing can be quick-played yet. */
  tiles: QuickPlayTile[];
  /** The options could not be loaded. */
  loadFailed?: boolean;
  onRetryLoad?: () => void;
  /** The chosen tile; null while the player is still on the category step. */
  selectedId: number | "any" | null;
  onSelect: (id: number | "any" | null) => void;
  /** Start a quiz at this difficulty (`null`: any). */
  onPlay: (difficultyId: number | null) => void;
  /** The board whose quiz is being fetched (`"any"` for the any-difficulty one). */
  pending?: number | "any" | null;
  /** The player has had every quiz for the choice they just made. */
  exhausted?: boolean;
  onPlayAgain?: () => void;
  /** The last pick failed (network, or the choice emptied since the page loaded). */
  pickFailed?: boolean;
}

const backClass =
  "group mb-4 flex w-fit items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-foreground";
const mutedFace = "flex items-center gap-2 bg-muted text-foreground";

const quizzes = (count: number) => `${count} quiz${count === 1 ? "" : "zes"}`;

/**
 * Quick play (docs/quiz/quick-play.md): two choices on a signpost. The first board stack is the
 * categories; pressing one swaps the boards for how hard, and that press starts a quiz the server
 * chose. The full list is a link on the hill under the post, on both steps.
 *
 * <b>Why a signpost (2026-11-18).</b> The first version was a grid of category cards, and a grid of
 * cards is what the catalogue already is — a visitor saw "another list to choose from", which is
 * the step quick play exists to remove. A signpost says *pick a direction and go*, and the two
 * steps become the same object asked twice. It also gives the page an order: one board per line,
 * fullest category first, instead of tiles of uneven width wrapping where they fit.
 *
 * The boards are plain `<button>`s, not `LiftedButton`s: they are the illustration's own pieces —
 * wood, pointed, hung at an angle — and a lifted face would be a button pasted onto a drawing. They
 * keep what a lifted button gives: a raised edge that drops when pressed, a focus ring, a pending
 * state. The page's real actions (Try again, Play one again) are `LiftedButton`s as usual.
 *
 * The steps swap in place, the old boards out and the new ones swinging in from the pole; under
 * reduced motion they only fade.
 */
export const QuickPlayView = ({
  tiles,
  loadFailed = false,
  onRetryLoad,
  selectedId,
  onSelect,
  onPlay,
  pending = null,
  exhausted = false,
  onPlayAgain,
  pickFailed = false,
}: QuickPlayViewProps) => {
  const reduceMotion = useReducedMotion();
  const selected = tiles.find((tile) => tile.id === selectedId) ?? null;
  const busy = pending !== null;
  const step = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.18, ease: "easeOut" as const },
  };

  return (
    <div className={cn("relative isolate flex flex-1 flex-col overflow-hidden", QUICK_PLAY_SKY)}>
      <QuickPlayBackdrop />

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-6 sm:pt-10">
        <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <motion.section key="level" {...step} aria-labelledby="quick-play-title" className="flex flex-1 flex-col">
              <button type="button" onClick={() => onSelect(null)} className={backClass}>
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
                Change category
              </button>
              <h1 id="quick-play-title" className="font-quiz text-3xl font-bold tracking-wide sm:text-5xl">
                {selected.name}
              </h1>
              <h2 className="mt-1 text-base font-medium text-foreground/70 sm:text-lg">How hard?</h2>

              <AnimatePresence initial={false}>
                {(exhausted || pickFailed) && (
                  <motion.div
                    key={exhausted ? "exhausted" : "failed"}
                    role="status"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-5 rounded-xl border bg-card p-4 shadow-sm">
                      {exhausted ? (
                        <>
                          <p className="font-medium">You&apos;ve played every quiz here.</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Try another difficulty or category, or play one of these again.
                          </p>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <LiftedButton type="button" disabled={busy} onClick={onPlayAgain} className="flex items-center gap-2">
                              <RotateCcw className="h-4 w-4" aria-hidden="true" />
                              Play one again
                            </LiftedButton>
                            <Link to="/choose-quiz" tabIndex={-1}>
                              <LiftedButton type="button" liftColor="muted-foreground" className={mutedFace}>
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                Browse all quizzes
                              </LiftedButton>
                            </Link>
                          </div>
                        </>
                      ) : (
                        <p className="font-medium">Couldn&apos;t find a quiz just now. Try again, or pick another.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Signpost>
                <Board
                  index={0}
                  label="Any difficulty"
                  ariaLabel="Any difficulty"
                  hint="?"
                  autoFocus
                  disabled={busy}
                  pending={pending === "any"}
                  onClick={() => onPlay(null)}
                />
                {selected.levels.length > 1 &&
                  selected.levels.map((level, i) => (
                    <Board
                      key={level.id}
                      index={i + 1}
                      label={level.label}
                      sub={quizzes(level.count)}
                      ariaLabel={`${level.label}, ${quizzes(level.count)}`}
                      disabled={busy}
                      pending={pending === level.id}
                      onClick={() => onPlay(level.id)}
                    />
                  ))}
              </Signpost>
            </motion.section>
          ) : (
            <motion.section key="category" {...step} aria-labelledby="quick-play-title" className="flex flex-1 flex-col">
              <Link to="/choose-mode" className={backClass}>
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
                Back
              </Link>
              <h1 id="quick-play-title" className="font-quiz text-3xl font-bold tracking-wide sm:text-5xl">
                Where to?
              </h1>

              {loadFailed ? (
                <div className="mt-6 rounded-xl border bg-card p-6 text-center shadow-sm" role="alert">
                  <p className="font-medium">Couldn&apos;t load the categories.</p>
                  <LiftedButton type="button" onClick={onRetryLoad} outerClassName="mt-4" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Try again
                  </LiftedButton>
                </div>
              ) : tiles.length === 0 ? (
                <div className="mt-6 rounded-xl border bg-card p-6 text-center shadow-sm">
                  <p className="font-medium">There&apos;s nothing to quick play yet.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Every quiz is in the full list.</p>
                </div>
              ) : (
                <Signpost>
                  {tiles.map((tile, i) => (
                    <Board
                      key={tile.id}
                      index={i}
                      label={tile.name}
                      sub={quizzes(tile.count)}
                      hint={tile.id === "any" ? "?" : undefined}
                      ariaLabel={`${tile.name}, ${quizzes(tile.count)}`}
                      onClick={() => onSelect(tile.id)}
                    />
                  ))}
                </Signpost>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <QuickPlayHill>
        <Link
          to="/choose-quiz"
          className="group flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-primary-foreground/85 transition-colors hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70"
        >
          Rather choose yourself? Browse all quizzes
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </QuickPlayHill>
    </div>
  );
};

/**
 * The post and the boards on it. The post runs from the top board down past the last one, and the
 * hill (`QuickPlayHill`, drawn after this) covers its foot — so it stands in the ground however
 * many boards it carries.
 */
const Signpost = ({ children }: { children: ReactNode }) => (
  <div className="relative mt-8 flex-1 pb-24 sm:mt-10 sm:pb-28">
    <div
      className="absolute bottom-0 left-1/2 top-1 w-3.5 -translate-x-1/2 rounded-t-md bg-amber-800 bg-[linear-gradient(90deg,transparent_0_35%,var(--color-amber-700)_35%_45%,transparent_45%)] sm:w-4 dark:bg-amber-900"
      aria-hidden="true"
    >
      <div className="absolute -left-1 -right-1 -top-1.5 h-2.5 rounded-sm bg-amber-900 dark:bg-amber-950" />
    </div>
    <ul className="relative space-y-3 sm:space-y-4">{children}</ul>
  </div>
);

/** Each board hangs a little off true, by its place on the post — never the same for two in a row. */
const TILTS = [-3, 2.5, -1.5, 3, -2.5, 1.5, -2, 2];

interface BoardProps {
  /** Its place on the post: which side it points to, its tilt, when it swings in. */
  index: number;
  label: string;
  /** A second, smaller line (the quiz count). */
  sub?: string;
  /** A big glyph painted on the board, before the words ("?" on the surprise boards). */
  hint?: string;
  /** What a screen reader hears, when the visible words aren't enough. */
  ariaLabel?: string;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
  autoFocus?: boolean;
}

/**
 * One board: pointed away from the post, alternating sides, wood-grained. It hangs from its end at
 * the post, so it swings in from there. No category colour on it: the wood is the scene's one
 * accent (see `quick-play-scene.tsx`).
 *
 * The point is a `clip-path`, and the raised edge a `drop-shadow` on a wrapper around it — a
 * drop-shadow follows the clipped shape where a box-shadow would draw a rectangle. Hover lifts the
 * board and its edge; pressing drops it, as a lifted button does.
 */
const Board = ({ index, label, sub, hint, ariaLabel, onClick, disabled, pending, autoFocus }: BoardProps) => {
  const reduceMotion = useReducedMotion();
  const right = index % 2 === 0;
  const tilt = TILTS[index % TILTS.length];

  return (
    <li className="grid grid-cols-2">
      <motion.div
        className={cn(
          "relative z-10 w-[calc(100%+1.25rem)]",
          right ? "col-start-2 -ml-5" : "col-start-1 -mr-5 justify-self-end",
        )}
        style={{ originX: right ? 0 : 1, originY: 0.5 }}
        initial={reduceMotion ? { opacity: 0, rotate: tilt } : { opacity: 0, rotate: right ? -28 : 28 }}
        animate={{ opacity: 1, rotate: tilt }}
        transition={{
          duration: reduceMotion ? 0.15 : 0.3,
          delay: reduceMotion ? 0 : Math.min(index, 8) * 0.03,
          ease: [0.34, 1.4, 0.64, 1],
        }}
      >
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          aria-busy={pending || undefined}
          className={cn(
            "group block w-full max-w-[18rem] text-left focus-visible:outline-none disabled:cursor-wait",
            !right && "ml-auto",
          )}
        >
          {/* The focus outline is four more drop-shadows, so it follows the point; a ring would
              draw a rectangle round it. */}
          <span className="block transition-[transform,filter] duration-150 [filter:drop-shadow(0_4px_0_var(--color-amber-900))] group-hover:-translate-y-0.5 group-hover:[filter:drop-shadow(0_6px_0_var(--color-amber-900))] group-active:translate-y-0.5 group-active:[filter:drop-shadow(0_1px_0_var(--color-amber-900))] group-focus-visible:[filter:drop-shadow(0_4px_0_var(--color-amber-900))_drop-shadow(3px_0_0_hsl(var(--primary)))_drop-shadow(-3px_0_0_hsl(var(--primary)))_drop-shadow(0_3px_0_hsl(var(--primary)))_drop-shadow(0_-3px_0_hsl(var(--primary)))] group-disabled:group-hover:translate-y-0 motion-reduce:transition-none">
            <span
              className={cn(
                "relative flex min-h-[3.25rem] items-center gap-3 bg-amber-300 bg-[repeating-linear-gradient(178deg,transparent_0_13px,color-mix(in_srgb,var(--color-amber-700)_16%,transparent)_13px_15px),repeating-linear-gradient(172deg,transparent_0_23px,color-mix(in_srgb,var(--color-amber-700)_10%,transparent)_23px_24px)] py-2 text-amber-950 sm:min-h-[3.75rem] dark:bg-amber-400",
                right
                  ? "pl-7 pr-9 [clip-path:polygon(0_0,calc(100%-1.4rem)_0,100%_50%,calc(100%-1.4rem)_100%,0_100%)]"
                  : "pl-9 pr-7 [clip-path:polygon(1.4rem_0,100%_0,100%_100%,1.4rem_100%,0_50%)]",
              )}
            >
              {/* The nail through the board into the post. */}
              <span
                className={cn(
                  "absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-amber-900/70",
                  right ? "left-2.5" : "right-2.5",
                )}
                aria-hidden="true"
              />
              {pending ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-amber-900" aria-hidden="true" />
              ) : hint ? (
                <span className="shrink-0 font-quiz text-2xl font-black leading-none text-amber-900" aria-hidden="true">
                  {hint}
                </span>
              ) : null}
              <span className="min-w-0">
                <span className="block break-words font-quiz text-sm font-bold leading-tight tracking-wide sm:text-base">
                  {label}
                </span>
                {sub && <span className="block text-xs text-amber-900/80">{sub}</span>}
              </span>
            </span>
          </span>
        </button>
      </motion.div>
    </li>
  );
};
