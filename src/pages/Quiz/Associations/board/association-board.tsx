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
 * Read-only when `onOpenTile` is absent. What it can show is only what the view carries: a closed
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
};

export const AssociationBoard = ({ view, target, onOpenTile, onSelectTarget, busy = false, beckon = false }: AssociationBoardProps) => {
  const playable = !view.isOver && !!onOpenTile && !busy;
  const canAim = !view.isOver && !!onSelectTarget && !busy;

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
}: {
  column: AssociationColumnView;
  over: boolean;
  playable: boolean;
  selected: boolean;
  beckon: boolean;
  onOpenTile?: (tileId: number) => void;
  onSelect?: () => void;
}) => (
  <section aria-label={`Column ${column.letter}`} className="flex flex-col gap-1.5 sm:gap-2">
    {column.tiles.map((tile) => (
      <BoardTile
        key={tile.id}
        letter={column.letter}
        tile={tile}
        over={over}
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
    />
  </section>
);

const BoardTile = ({
  letter,
  tile,
  over,
  onOpen,
}: {
  letter: string;
  tile: AssociationTileView;
  over: boolean;
  onOpen?: () => void;
}) => {
  const name = `${letter}${tile.position + 1}`;

  if (tile.isOpen) {
    return (
      <div className="flex min-h-12 items-center justify-center rounded-md border border-border bg-card px-2 py-2 text-center text-sm font-medium break-words sm:min-h-14 sm:text-base">
        {tile.text}
      </div>
    );
  }

  // Over, never opened: shown for the review, but visibly not something the player saw in play.
  if (over) {
    return (
      <div className="flex min-h-12 items-center justify-center rounded-md border border-dashed border-border px-2 py-2 text-center text-sm text-muted-foreground break-words sm:min-h-14">
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
}) => {
  if (solved) {
    return (
      <div className="flex min-h-12 w-full items-center justify-between gap-2 rounded-md border-2 border-quiz-success bg-quiz-success/15 px-3 py-2 text-sm font-semibold sm:min-h-14 sm:text-base">
        <span className="min-w-0 break-words">{solution}</span>
        <span className="shrink-0 text-xs font-medium tabular-nums text-quiz-success">
          {viaFinal ? "via final" : `+${points ?? 0}`}
        </span>
      </div>
    );
  }

  if (over) {
    return (
      <div className="flex min-h-12 w-full items-center rounded-md border-2 border-dashed border-border px-3 py-2 text-sm text-muted-foreground break-words sm:min-h-14">
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
