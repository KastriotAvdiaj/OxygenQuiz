import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useAnimate } from "framer-motion";
import { Info, PencilLine, Send } from "lucide-react";
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
/**
 * Put these on a wrapper to sit the board on a `bg-muted` card (the Host Controller and Display).
 * `border-border` and `bg-muted/40` are the same tone as `muted`, so the slots that rely on them
 * read as nothing there; inside this wrapper they take a `bg-background` fill instead. Opt-in by
 * wrapper, not a prop, so the solo and Duel boards on the plain page are unchanged.
 */
export const MUTED_SURFACE = { "data-surface": "muted", className: "group/surface" } as const;

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
  /**
   * What to tell someone who clicks a closed Tile they can't open right now — "Guess a column or
   * the final — or pass.", "It's not your turn." Given, a blocked click shakes that Tile and shows
   * this over the board for a moment, instead of the click doing nothing. Each page words it from
   * its own rules (solo has no Pass; the Duel has turns). Omit it and a blocked Tile stays inert.
   */
  openBlockedHint?: string;
};

/** How long the blocked-open hint stays up. */
const HINT_MS = 2600;

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
  openBlockedHint,
}: AssociationBoardProps) => {
  const playable = !view.isOver && !!onOpenTile && !busy;
  // A blocked click only counts when the board is otherwise live: not over, nothing in flight.
  const blockable = !view.isOver && !onOpenTile && !busy && !!openBlockedHint;
  const [hint, setHint] = useState<{ tileId: number; key: number } | null>(null);
  const hintTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(hintTimer.current), []);
  const showHint = (tileId: number) => {
    if (!openBlockedHint) return;
    // A fresh key re-announces it and restarts the fade on a second click.
    setHint({ tileId, key: Date.now() });
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(null), HINT_MS);
  };
  const timing = reveal && view.isOver ? revealTiming(view) : null;
  const by = (seat: number | null) => (seat === null || !solverName ? undefined : solverName(seat));
  // Not gated on `busy`: disabling the inputs while a Guess is in flight would drop the focus the
  // player needs for the next one. Each input waits for its own Guess; the page refuses a move
  // while another is in flight.
  const guess = !view.isOver ? onGuess : undefined;

  return (
    // The Final stands apart from the Columns: it answers all four, not a fifth one.
    <div className="space-y-5 sm:space-y-7">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {view.columns.map((column) => (
          <BoardColumn
            key={column.letter}
            column={column}
            over={view.isOver}
            onOpenTile={playable ? onOpenTile : undefined}
            onBlockedOpen={blockable ? showHint : undefined}
            hint={hint && openBlockedHint ? { ...hint, text: openBlockedHint } : null}
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
  onBlockedOpen,
  hint,
  onGuess,
  revealAt,
  by,
}: {
  column: AssociationColumnView;
  over: boolean;
  onOpenTile?: (tileId: number) => void;
  onBlockedOpen?: (tileId: number) => void;
  hint: { tileId: number; key: number; text: string } | null;
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
        onBlocked={onBlockedOpen ? () => onBlockedOpen(tile.id) : undefined}
        hint={hint?.tileId === tile.id ? hint : null}
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
 * A Tile is a card with two faces: its name (A1) on the front — solid primary, a button to press,
 * so it can't be mistaken for the guess inputs under it — and its word on the back. Opening it
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
  onBlocked,
  hint,
  revealDelay,
}: {
  letter: string;
  tile: AssociationTileView;
  over: boolean;
  onOpen?: () => void;
  /** Clicked while it can't be opened: shake, and let the board say why. */
  onBlocked?: () => void;
  /** The blocked-open hint, when it's this Tile that was clicked. */
  hint: { key: number; text: string } | null;
  revealDelay?: number;
}) => {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  // Not focusable-but-dead: with a hint to give, the Tile stays a real button (aria-disabled, so
  // it still reads as unavailable) and the click explains itself. Without one it's disabled.
  const blocked = !onOpen && !!onBlocked;
  const handleClick = () => {
    if (onOpen) return onOpen();
    if (!onBlocked) return;
    onBlocked();
    // The wrapper shakes, not the card: the card owns the 3D flip transform.
    if (scope.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      void animate(scope.current, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.35 });
  };
  const name = `${letter}${tile.position + 1}`;
  // Over and never opened: turned for the review, but visibly not something the player saw in play.
  const revealed = tile.isOpen || over;

  return (
    <div ref={scope} className="board-tile">
      <BlockedHint anchor={scope} hint={hint} />
      <div
        className={cn("board-tile-card", revealed && "is-flipped")}
        // A runtime delay is a style, not a class (CLAUDE.md: class strings stay literal).
        style={revealDelay === undefined ? undefined : { transitionDelay: `${revealDelay}s` }}
      >
        {revealed ? (
          <div
            aria-hidden
            className="flex min-h-12 items-center justify-center rounded-md bg-primary text-sm font-semibold tabular-nums text-primary-foreground shadow-[0_3px_0_0_hsl(var(--quiz-primary-dark))] sm:min-h-14"
          >
            {name}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            disabled={!onOpen && !blocked}
            aria-disabled={blocked || undefined}
            aria-label={`Open tile ${name}`}
            data-coach-tile={tile.id}
            className="flex min-h-12 items-center justify-center rounded-md bg-primary text-sm font-semibold tabular-nums text-primary-foreground shadow-[0_3px_0_0_hsl(var(--quiz-primary-dark))] transition-[filter,transform,box-shadow] hover:brightness-110 active:translate-y-[3px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-default disabled:hover:brightness-100 disabled:active:translate-y-0 disabled:active:shadow-[0_3px_0_0_hsl(var(--quiz-primary-dark))] aria-disabled:cursor-default aria-disabled:hover:brightness-100 aria-disabled:active:translate-y-0 aria-disabled:active:shadow-[0_3px_0_0_hsl(var(--quiz-primary-dark))] sm:min-h-14"
          >
            {name}
          </button>
        )}
        <div
          aria-hidden={!revealed}
          className={cn(
            "board-tile-back flex min-h-12 items-center justify-center rounded-md px-2 py-2 text-center text-sm break-words sm:min-h-14",
            // Uppercase, as the show writes them; an opened Tile keeps a faint shade of the
            // primary it was, so the board still reads as one grid of Tiles.
            "uppercase tracking-wide",
            tile.isOpen
              ? "border border-primary/30 bg-primary/20 font-semibold"
              : "border border-dashed border-border bg-background text-muted-foreground"
          )}
        >
          {tile.text}
        </div>
      </div>
    </div>
  );
};

/**
 * The blocked-open hint, over the Tile that was clicked. Portalled to `<body>` and placed with
 * `position: fixed` from the Tile's rect: every Tile is a 3D flip card (`preserve-3d`), and those
 * paint over anything in the board's own stacking order — z-index included — so a hint drawn
 * inside the board went under the neighbouring Tiles. Dark neutral, not red: it's guidance, not
 * a wrong answer, and red is a Team's colour in Host mode.
 */
const BlockedHint = ({
  anchor,
  hint,
}: {
  anchor: React.RefObject<HTMLDivElement>;
  hint: { key: number; text: string } | null;
}) => {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!hint || !anchor.current) return;
    const rect = anchor.current.getBoundingClientRect();
    setAt({ x: rect.left + rect.width / 2, y: rect.top });
  }, [hint, anchor]);
  // One line, centred over the Tile — then nudged back inside the window when that would run off
  // an edge (a D Tile with the screen ending right after it). Measured before paint, so it never
  // flashes in the wrong place. It only wraps when it's wider than the window itself.
  useLayoutEffect(() => {
    const node = box.current;
    if (!node || !at) return;
    const margin = 8;
    const width = node.offsetWidth;
    const left = Math.min(Math.max(at.x - width / 2, margin), window.innerWidth - width - margin);
    node.style.left = `${Math.max(left, margin)}px`;
  }, [at, hint]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {hint && at && (
        // Two layers: the outer one is placed (left set above, lifted with a Tailwind translate),
        // the inner one is animated — framer writes an inline `transform` that would replace it.
        <div
          key={hint.key}
          ref={box}
          className="pointer-events-none fixed z-[60] -translate-y-full pb-1.5"
          style={{ left: at.x, top: at.y }}
        >
          <motion.p
            role="status"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex w-max max-w-[calc(100vw-1rem)] items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background shadow-lg sm:text-sm"
          >
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {hint.text}
          </motion.p>
        </div>
      )}
    </AnimatePresence>,
    document.body,
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
          // On a muted surface (see MUTED_SURFACE) the dashed `border-border` is the same tone as
          // the card and disappears — a background fill keeps the slot visible.
          "group-data-[surface=muted]/surface:bg-background",
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
        "flex min-h-12 w-full items-center gap-2 rounded-md border-2 pl-3 pr-1 transition-[border-color,box-shadow,background-color] sm:min-h-14",
        // Solid, never dashed: five dashed slots made the board busy. A Guess is earned: a white
        // field with a quiet primary border that goes full primary while typing in it — the state
        // is what gets the colour (docs/quiz/question-type-color-schema.md). Otherwise grey on grey.
        live
          ? "cursor-text border-primary/30 bg-background hover:border-primary/60 focus-within:border-primary"
          : "border-border bg-muted/40 group-data-[surface=muted]/surface:bg-background"
      )}
      onClick={(e) => {
        // The whole field is the target, like an input, not only the text inside it.
        if (live && e.target === e.currentTarget) e.currentTarget.querySelector("input")?.focus();
      }}
    >
      {live && <PencilLine aria-hidden className="h-4 w-4 shrink-0 text-primary" />}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!onGuess}
        maxLength={MAX_GUESS_LENGTH}
        autoComplete="off"
        spellCheck={false}
        aria-label={`Guess ${label.toLowerCase()}`}
        // A live slot says it is typed into; an idle one only names itself.
        placeholder={live ? `Guess ${label}…` : `${label} ?`}
        // text-base on phones: anything smaller and iOS Safari zooms on focus (docs/RESPONSIVE.md).
        className={cn(
          "min-w-0 flex-1 bg-transparent py-2 text-base font-semibold outline-none placeholder:font-medium placeholder:text-muted-foreground disabled:cursor-default sm:text-sm",
          emphasis && "sm:text-base"
        )}
      />
      {live && (
        <button
          type="submit"
          disabled={!trimmed}
          aria-label={`Send guess for ${label.toLowerCase()}`}
          // Filled once there's text: a solid primary button says "send this", for anyone who
          // wouldn't think of Enter. Empty, it's a quiet grey icon.
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:bg-transparent disabled:text-muted-foreground disabled:shadow-none"
        >
          <Send className="h-4 w-4" />
        </button>
      )}
    </form>
  );
};
