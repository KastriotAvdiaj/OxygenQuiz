import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Play, RefreshCw, RotateCcw, Shuffle } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";

import { quizEdgeColor, readableTextColor } from "../components/quiz-palette";
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
  /** The button whose quiz is being fetched (`"any"` for the any-difficulty one). */
  pending?: number | "any" | null;
  /** The player has had every quiz for the choice they just made. */
  exhausted?: boolean;
  onPlayAgain?: () => void;
  /** The last pick failed (network, or the choice emptied since the page loaded). */
  pickFailed?: boolean;
}

const backClass =
  "group mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground";
const mutedFace = "flex items-center gap-2 bg-muted text-foreground";

/** A tile's colours as custom properties: a category colour is a runtime value, so it can't be a class. */
const tileColours = (color?: string): CSSProperties =>
  (color
    ? { "--face": color, "--face-text": readableTextColor(color), "--edge": quizEdgeColor(color) }
    : { "--face": "hsl(var(--primary))", "--face-text": "#ffffff", "--edge": "var(--primary-edge)" }) as CSSProperties;

const quizzes = (count: number) => `${count} quiz${count === 1 ? "" : "zes"}`;

/**
 * Quick play (docs/quiz/quick-play.md): two taps to a quiz. Step one is a category, step two is
 * how hard — and the second tap starts a quiz the server chose. The catalogue is one link away
 * on both steps for anyone who would rather pick.
 *
 * Two steps on one page rather than a difficulty row under the grid: on a phone the row would
 * open below a screenful of tiles, out of sight of the tap that opened it. The steps swap in
 * place (fade and a short rise; a fade alone under reduced motion), and step two takes focus on
 * its first button so a keyboard or screen-reader user lands where the page now is.
 *
 * No description under the title: the tiles say what to do.
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
    initial: { opacity: 0, y: reduceMotion ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduceMotion ? 0 : -8 },
    transition: { duration: 0.2, ease: "easeOut" as const },
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 text-foreground sm:py-10">
      <AnimatePresence mode="wait" initial={false}>
        {selected ? (
          <motion.section key="level" {...step} aria-labelledby="quick-play-title">
            <button type="button" onClick={() => onSelect(null)} className={backClass}>
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
              Change category
            </button>

            <div className="flex items-center gap-3" style={tileColours(selected.color)}>
              <TileChip tile={selected} />
              <h1 id="quick-play-title" className="font-quiz text-2xl font-bold tracking-wide sm:text-4xl">
                {selected.name}
              </h1>
            </div>
            <h2 className="mt-6 text-sm font-medium text-muted-foreground">How hard?</h2>

            <div className="mt-3 flex flex-wrap gap-3" style={tileColours(selected.color)}>
              <LiftedButton
                type="button"
                autoFocus
                disabled={busy}
                isPending={pending === "any"}
                onClick={() => onPlay(null)}
                liftColor={selected.color ?? "primary"}
                className="flex items-center gap-2 bg-[var(--face)] px-6 text-lg text-[color:var(--face-text)]"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                Any difficulty
              </LiftedButton>
              {selected.levels.length > 1 &&
                selected.levels.map((level) => (
                  <LiftedButton
                    key={level.id}
                    type="button"
                    disabled={busy}
                    isPending={pending === level.id}
                    onClick={() => onPlay(level.id)}
                    liftColor="muted-foreground"
                    className={`${mutedFace} px-5 text-lg`}
                    aria-label={`${level.label}, ${quizzes(level.count)}`}
                  >
                    <Play className="h-4 w-4" aria-hidden="true" />
                    {level.label}
                    <span className="text-xs font-normal text-muted-foreground">{level.count}</span>
                  </LiftedButton>
                ))}
            </div>

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
                  <div className="mt-6 rounded-xl border bg-card p-4">
                    {exhausted ? (
                      <>
                        <p className="font-medium">You&apos;ve played every quiz here.</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Try another difficulty or category, or play one of these again.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <LiftedButton
                            type="button"
                            disabled={busy}
                            onClick={onPlayAgain}
                            className="flex items-center gap-2"
                          >
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
          </motion.section>
        ) : (
          <motion.section key="category" {...step} aria-labelledby="quick-play-title">
            <Link to="/choose-mode" className={backClass}>
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
              Back
            </Link>
            <h1 id="quick-play-title" className="font-quiz text-2xl font-bold tracking-wide sm:text-4xl">
              Pick a category
            </h1>

            {loadFailed ? (
              <div className="mt-6 rounded-xl border bg-card p-6 text-center" role="alert">
                <p className="font-medium">Couldn&apos;t load the categories.</p>
                <LiftedButton type="button" onClick={onRetryLoad} outerClassName="mt-4" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Try again
                </LiftedButton>
              </div>
            ) : tiles.length === 0 ? (
              <div className="mt-6 rounded-xl border bg-card p-6 text-center">
                <p className="font-medium">There&apos;s nothing to quick play yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">Every quiz is in the full list.</p>
              </div>
            ) : (
              <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {tiles.map((tile, index) => (
                  <motion.li
                    key={tile.id}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: reduceMotion ? 0 : Math.min(index, 8) * 0.03, ease: "easeOut" }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(tile.id)}
                      style={tileColours(tile.color)}
                      className="group flex h-full w-full flex-col gap-3 rounded-2xl border-2 border-border bg-card p-4 text-left shadow-[0_4px_0_0_var(--edge)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_7px_0_0_var(--edge)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-[2px] active:shadow-[0_2px_0_0_var(--edge)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      <TileChip tile={tile} />
                      <span className="min-w-0">
                        <span className="block break-words font-quiz text-base font-bold tracking-wide sm:text-lg">
                          {tile.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">{quizzes(tile.count)}</span>
                      </span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}

            <p className="mt-8 text-sm text-muted-foreground">
              Rather choose yourself?{" "}
              <Link to="/choose-quiz" className="font-medium text-primary underline-offset-4 hover:underline">
                Browse all quizzes
              </Link>
            </p>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

/** The tile's mark: its category's colour with the name's first letter, or a shuffle for any-category. */
const TileChip = ({ tile }: { tile: QuickPlayTile }) => (
  <span
    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--face)] font-quiz text-lg font-bold text-[color:var(--face-text)] shadow-[0_3px_0_0_var(--edge)] sm:h-12 sm:w-12"
    aria-hidden="true"
  >
    {tile.id === "any" ? <Shuffle className="h-5 w-5" /> : tile.name.trim().charAt(0).toUpperCase()}
  </span>
);
