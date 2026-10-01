import { cn } from "@/utils/cn";
import type {
  AssociationBoardView,
  AssociationColumnView,
  AssociationTileView,
  GuessTarget,
} from "@/types/association-types";

/**
 * The Associations board, drawn from a server view — used by Solo play, the Duel and the results
 * review. It never calls the API: a click on a closed Tile or on a
 * solution slot goes up through a callback, and the new view comes back down (the play stack's
 * golden rule, docs/quiz/quiz-playing-architecture.md §1).
 *
 * Read-only when `onOpenTile` is absent. With `reveal`, a finished board flips its hidden Tiles and
 * solutions in one by one (docs/quiz/associations.md §9.9). What it can show is only what the view carries: a closed
 * Tile has no text to show (docs/quiz/associations.md, "What the client sees").
 */
export type AssociationBoardProps = {
  view: AssociationBoardView;
  /** The solution slot the guess box is aimed at — outlined. */
  target?: GuessTarget | null;
  onOpenTile?: (tileId: number) => void;
  onSelectTarget?: (target: GuessTarget) => void;
  /** A move is in flight: nothing is clickable until it lands. */
  busy?: boolean;
  /**
   * A Guess is earned but not aimed yet: the open solution slots are outlined to say "pick one".
   * Only the slots are clickable for a target when `onSelectTarget` is given, which the page does
   * only while a Guess is earned (docs/quiz/associations.md §3.2).
   */
  beckon?: boolean;
  /**
   * Play the end-of-game reveal: every Tile and solution the player hadn't seen flips in, one
   * after another (a won Final pops first). Pass it only on the board the game ended on — the
   * results review is static.
   */
  reveal?: boolean;
  /** Duel: who solved a slot, shown after its points. */
  solverName?: (seat: number) => string | undefined;
};

/** Seconds between two flips in the reveal. */
const REVEAL_STEP = 0.07;

type RevealTiming = { final?: number; columns: Record<string, { tiles: Record<number, number>; solution: number } | undefined> };

/**
 * When each hidden thing flips in: the won Final first, then column by column (Tiles top to
 * bottom, then the solution), and an unsolved Final last. Anything the player already saw keeps
 * no delay and never animates.
 */
const revealTiming = (view: AssociationBoardView): RevealTiming => {
  const timing: RevealTiming = { columns: {} };
  let at = 0.1;
  if (view.final.solved) {
    timing.final = at;
    at += 0.45;
  }
  view.columns.forEach((column) => {
    // Solved by a guess: the player watched it happen, nothing to reveal.
    if (column.solved && !column.viaFinal) return;
    const tiles: Record<number, number> = {};
    column.tiles.forEach((tile) => {
      if (!tile.isOpen || tile.openedBySeat === null) tiles[tile.id] = at + tile.position * REVEAL_STEP;
    });
    timing.columns[column.letter] = { tiles, solution: at + 4 * REVEAL_STEP };
    at += 5 * REVEAL_STEP;
  });
  if (!view.final.solved) timing.final = at;
  return timing;
};

/** The animation class and its delay for one revealed element, or nothing. */
const revealStyle = (delay: number | undefined, className = "board-reveal") =>
  delay === undefined
    ? { style: undefined, className: "" }
    : { style: { animationDelay: `${delay}s` }, className };

export const AssociationBoard = ({
  view,
  target,
  onOpenTile,
  onSelectTarget,
  busy = false,
  beckon = false,
  reveal = false,
  solverName,
}: AssociationBoardProps) => {
  const playable = !view.isOver && !!onOpenTile && !busy;
  const canAim = !view.isOver && !!onSelectTarget && !busy;
  const timing = reveal && view.isOver ? revealTiming(view) : null;
  const by = (seat: number | null) => (seat === null || !solverName ? undefined : solverName(seat));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {view.columns.map((column) => (
          <BoardColumn
            key={column.letter}
            column={column}
            over={view.isOver}
            playable={playable}
            selected={target === column.letter}
            onOpenTile={onOpenTile}
            beckon={beckon}
            onSelect={canAim ? () => onSelectTarget!(column.letter) : undefined}
            revealAt={timing?.columns[column.letter]}
            by={by(column.solvedBySeat)}
          />
        ))}
      </div>

      <SolutionSlot
        label="Final solution"
        solved={view.final.solved}
        solution={view.final.solution}
        points={view.final.points}
        over={view.isOver}
        selected={target === "Final"}
        beckon={beckon}
        onSelect={canAim && !view.final.solved ? () => onSelectTarget!("Final") : undefined}
        emphasis
        by={by(view.final.solvedBySeat)}
        revealDelay={timing?.final}
        celebrate={!!timing && view.final.solved}
      />
    </div>
  );
};

const BoardColumn = ({
  column,
  over,
  playable,
  selected,
  beckon,
  onOpenTile,
  onSelect,
  revealAt,
  by,
}: {
  column: AssociationColumnView;
  over: boolean;
  playable: boolean;
  selected: boolean;
  beckon: boolean;
  onOpenTile?: (tileId: number) => void;
  onSelect?: () => void;
  revealAt?: { tiles: Record<number, number>; solution: number };
  by?: string;
}) => (
  <section aria-label={`Column ${column.letter}`} className="flex flex-col gap-1.5 sm:gap-2">
    {column.tiles.map((tile) => (
      <BoardTile
        key={tile.id}
        letter={column.letter}
        tile={tile}
        over={over}
        revealDelay={revealAt?.tiles[tile.id]}
        onOpen={playable && !tile.isOpen && onOpenTile ? () => onOpenTile(tile.id) : undefined}
      />
    ))}
    <SolutionSlot
      label={`Column ${column.letter}`}
      solved={column.solved}
      solution={column.solution}
      points={column.points}
      viaFinal={column.viaFinal}
      over={over}
      selected={selected}
      beckon={beckon}
      onSelect={onSelect && !column.solved ? onSelect : undefined}
      by={by}
      revealDelay={revealAt?.solution}
    />
  </section>
);

const BoardTile = ({
  letter,
  tile,
  over,
  onOpen,
  revealDelay,
}: {
  letter: string;
  tile: AssociationTileView;
  over: boolean;
  onOpen?: () => void;
  revealDelay?: number;
}) => {
  const name = `${letter}${tile.position + 1}`;
  const flip = revealStyle(revealDelay);

  if (tile.isOpen) {
    return (
      <div
        style={flip.style}
        className={cn(
          "flex min-h-12 items-center justify-center rounded-md border border-border bg-card px-2 py-2 text-center text-sm font-medium break-words sm:min-h-14 sm:text-base",
          flip.className
        )}
      >
        {tile.text}
      </div>
    );
  }

  // Over, never opened: shown for the review, but visibly not something the player saw in play.
  if (over) {
    return (
      <div
        style={flip.style}
        className={cn(
          "flex min-h-12 items-center justify-center rounded-md border border-dashed border-border px-2 py-2 text-center text-sm text-muted-foreground break-words sm:min-h-14",
          flip.className
        )}
      >
        {tile.text}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      aria-label={`Open tile ${name}`}
      className="flex min-h-12 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-sm font-semibold tabular-nums text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:hover:bg-primary/10 sm:min-h-14"
    >
      {name}
    </button>
  );
};

const SolutionSlot = ({
  label,
  solved,
  solution,
  points,
  viaFinal = false,
  over,
  selected,
  beckon = false,
  onSelect,
  emphasis = false,
  by,
  revealDelay,
  celebrate = false,
}: {
  label: string;
  solved: boolean;
  solution: string | null;
  points: number | null;
  viaFinal?: boolean;
  over: boolean;
  selected: boolean;
  beckon?: boolean;
  onSelect?: () => void;
  emphasis?: boolean;
  by?: string;
  revealDelay?: number;
  celebrate?: boolean;
}) => {
  const flip = revealStyle(revealDelay, celebrate ? "board-final-win" : "board-reveal");

  if (solved) {
    return (
      <div
        style={flip.style}
        className={cn(
          "flex min-h-12 w-full items-center justify-between gap-2 rounded-md border-2 border-quiz-success bg-quiz-success/15 px-3 py-2 text-sm font-semibold sm:min-h-14 sm:text-base",
          emphasis && celebrate && "sm:min-h-16 sm:text-lg",
          flip.className
        )}
      >
        <span className="min-w-0 break-words">{solution}</span>
        <span className="shrink-0 text-xs font-medium tabular-nums text-quiz-success">
          {viaFinal ? "via final" : `+${points ?? 0}`}
          {by && <span className="text-muted-foreground"> · {by}</span>}
        </span>
      </div>
    );
  }

  if (over) {
    return (
      <div
        style={flip.style}
        className={cn(
          "flex min-h-12 w-full items-center rounded-md border-2 border-dashed border-border px-3 py-2 text-sm text-muted-foreground break-words sm:min-h-14",
          flip.className
        )}
      >
        {solution}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      aria-pressed={selected}
      aria-label={`Guess ${label.toLowerCase()}`}
      className={cn(
        "flex min-h-12 w-full items-center justify-center rounded-md border-2 px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default sm:min-h-14",
        selected
          ? "border-primary bg-primary/15 text-primary"
          : beckon && onSelect
            // Asking to be picked: solid primary outline instead of the resting dashed one.
            ? "border-primary/70 bg-primary/5 text-foreground hover:bg-primary/10"
            : "border-dashed border-border text-muted-foreground hover:border-primary/60",
        emphasis && "sm:text-base"
      )}
    >
      {label} ?
    </button>
  );
};
