import { useState } from "react";
import { useAnimate } from "framer-motion";
import { Send } from "lucide-react";
import { cn } from "@/utils/cn";
import type {
  AssociationBoardView,
  AssociationColumnView,
  AssociationTileView,
  GuessTarget,
} from "@/types/association-types";

/** Guess length. Mirrors the API's AssociationGameLimits.MaxGuessLength (a longer guess is refused, not cut). */
const MAX_GUESS_LENGTH = 200;

/**
 * What a Guess came to: right, wrong, `null` when it arrived too late to count, `undefined` when
 * it was refused or failed — then the typed text is kept so the player can send it again.
 */
export type GuessOutcome = boolean | null | undefined;

/**
 * The Associations board, drawn from a server view — used by Solo play, the Duel and the results
 * review. It never calls the API: a click on a closed Tile and a Guess typed into a solution slot
 * go up through callbacks, and the new view comes back down (the play stack's golden rule,
 * docs/quiz/quiz-playing-architecture.md §1).
 *
 * <b>Every unsolved solution slot is its own guess input</b> — the Column's or the Final's — so a
 * Guess names its target by where it is typed (docs/quiz/associations.md §9.9). The inputs are
 * live only while `onGuess` is given, which the page does only while a Guess is earned.
 *
 * Read-only when neither callback is given. With `reveal`, a finished board turns its hidden Tiles
 * and solutions in one by one (docs/quiz/associations.md §9.9). What it can show is only what the view carries: a
 * closed Tile has no text to show (docs/quiz/associations.md, "What the client sees").
 */
export type AssociationBoardProps = {
  view: AssociationBoardView;
  onOpenTile?: (tileId: number) => void;
  onGuess?: (target: GuessTarget, text: string) => Promise<GuessOutcome>;
  /** A move is in flight: no Tile is clickable until it lands. */
  busy?: boolean;
  /**
   * Play the end-of-game reveal: every Tile and solution the player hadn't seen turns in, one
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
 * When each hidden thing turns in: the won Final first, then column by column (Tiles top to
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

/** The animation class and its delay for one revealed solution slot, or nothing. */
const revealStyle = (delay: number | undefined, className = "board-reveal") =>
  delay === undefined
    ? { style: undefined, className: "" }
    : { style: { animationDelay: `${delay}s` }, className };

export const AssociationBoard = ({
  view,
  onOpenTile,
  onGuess,
  busy = false,
  reveal = false,
  solverName,
}: AssociationBoardProps) => {
  const playable = !view.isOver && !!onOpenTile && !busy;
  const timing = reveal && view.isOver ? revealTiming(view) : null;
  const by = (seat: number | null) => (seat === null || !solverName ? undefined : solverName(seat));
  // Not gated on `busy`: disabling the inputs while a Guess is in flight would drop the focus the
  // player needs for the next one. Each input waits for its own Guess; the page refuses a move
  // while another is in flight.
  const guess = !view.isOver ? onGuess : undefined;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {view.columns.map((column) => (
          <BoardColumn
            key={column.letter}
            column={column}
            over={view.isOver}
            onOpenTile={playable ? onOpenTile : undefined}
            onGuess={guess}
            revealAt={timing?.columns[column.letter]}
            by={by(column.solvedBySeat)}
          />
        ))}
      </div>

      <SolutionSlot
        target="Final"
        label="Final solution"
        solved={view.final.solved}
        solution={view.final.solution}
        points={view.final.points}
        over={view.isOver}
        onGuess={guess}
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
  onOpenTile,
  onGuess,
  revealAt,
  by,
}: {
  column: AssociationColumnView;
  over: boolean;
  onOpenTile?: (tileId: number) => void;
  onGuess?: AssociationBoardProps["onGuess"];
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
        onOpen={onOpenTile && !tile.isOpen ? () => onOpenTile(tile.id) : undefined}
      />
    ))}
    <SolutionSlot
      target={column.letter}
      label={`Column ${column.letter}`}
      solved={column.solved}
      solution={column.solution}
      points={column.points}
      viaFinal={column.viaFinal}
      over={over}
      onGuess={onGuess}
      by={by}
      revealDelay={revealAt?.solution}
    />
  </section>
);

/**
 * A Tile is a card with two faces: its name (A1) on the front, its word on the back. Opening it
 * — or solving its Column, or the game ending — turns the card over (`.board-tile-card` in
 * global.css). The flip is a CSS transition on the view changing, so a Tile that arrives already
 * open (a resumed game, the results page) is simply drawn face up, with no animation. In the
 * end-of-game reveal, `revealDelay` holds each card back so the board turns over one by one.
 */
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
  // Over and never opened: turned for the review, but visibly not something the player saw in play.
  const revealed = tile.isOpen || over;

  return (
    <div className="board-tile">
      <div
        className={cn("board-tile-card", revealed && "is-flipped")}
        // A runtime delay is a style, not a class (CLAUDE.md: class strings stay literal).
        style={revealDelay === undefined ? undefined : { transitionDelay: `${revealDelay}s` }}
      >
        {revealed ? (
          <div
            aria-hidden
            className="flex min-h-12 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-sm font-semibold tabular-nums text-primary sm:min-h-14"
          >
            {name}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            disabled={!onOpen}
            aria-label={`Open tile ${name}`}
            data-coach-tile={tile.id}
            className="flex min-h-12 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-sm font-semibold tabular-nums text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:hover:bg-primary/10 sm:min-h-14"
          >
            {name}
          </button>
        )}
        <div
          aria-hidden={!revealed}
          className={cn(
            "board-tile-back flex min-h-12 items-center justify-center rounded-md px-2 py-2 text-center text-sm break-words sm:min-h-14",
            tile.isOpen
              ? "border border-border bg-card font-medium sm:text-base"
              : "border border-dashed border-border bg-background text-muted-foreground"
          )}
        >
          {tile.text}
        </div>
      </div>
    </div>
  );
};

const SolutionSlot = ({
  target,
  label,
  solved,
  solution,
  points,
  viaFinal = false,
  over,
  onGuess,
  emphasis = false,
  by,
  revealDelay,
  celebrate = false,
}: {
  target: GuessTarget;
  label: string;
  solved: boolean;
  solution: string | null;
  points: number | null;
  viaFinal?: boolean;
  over: boolean;
  onGuess?: AssociationBoardProps["onGuess"];
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

  return <GuessInput target={target} label={label} onGuess={onGuess} emphasis={emphasis} />;
};

/**
 * An unsolved solution slot, as the place its Guess is typed. Enter or the arrow sends it. A
 * wrong Guess shakes the slot — started from the submit handler, where the answer arrives, not
 * from an Effect watching for it.
 */
const GuessInput = ({
  target,
  label,
  onGuess,
  emphasis,
}: {
  target: GuessTarget;
  label: string;
  onGuess?: AssociationBoardProps["onGuess"];
  emphasis: boolean;
}) => {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [scope, animate] = useAnimate<HTMLFormElement>();
  const live = !!onGuess && !sending;
  const trimmed = text.trim();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onGuess || !trimmed || sending) return;
    setSending(true);
    try {
      const outcome = await onGuess(target, trimmed);
      if (outcome !== undefined) setText("");
      if (outcome === false && scope.current) {
        void animate(scope.current, { x: [0, -8, 8, -5, 5, 0] }, { duration: 0.4 });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      ref={scope}
      onSubmit={handleSubmit}
      data-coach-target={target}
      className={cn(
        "flex min-h-12 w-full items-center gap-1 rounded-md border-2 bg-background pl-3 pr-1 transition-colors focus-within:border-primary sm:min-h-14",
        // A Guess is earned: the slots ask to be typed into.
        live ? "border-primary/70 bg-primary/5" : "border-dashed border-border"
      )}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!onGuess}
        maxLength={MAX_GUESS_LENGTH}
        autoComplete="off"
        spellCheck={false}
        aria-label={`Guess ${label.toLowerCase()}`}
        placeholder={`${label} ?`}
        // text-base on phones: anything smaller and iOS Safari zooms on focus (docs/RESPONSIVE.md).
        className={cn(
          "min-w-0 flex-1 bg-transparent py-2 text-base font-semibold outline-none placeholder:font-semibold placeholder:text-muted-foreground disabled:cursor-default sm:text-sm",
          emphasis && "sm:text-base"
        )}
      />
      {live && (
        <button
          type="submit"
          disabled={!trimmed}
          aria-label={`Send guess for ${label.toLowerCase()}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:text-muted-foreground disabled:hover:bg-transparent"
        >
          <Send className="h-4 w-4" />
        </button>
      )}
    </form>
  );
};
