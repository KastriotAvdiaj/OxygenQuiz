import type {
  AssociationEndReason,
  AssociationGameView,
  AssociationMoveView,
  ColumnLetter,
  GuessTarget,
} from "@/types/association-types";

// Pure helpers for the Associations screens — everything here is derived from the server's view
// during render (CLAUDE.md: derive, don't store). Behaviour: docs/quiz/associations.md.

/**
 * Milliseconds left on the board clock, corrected for the difference between the server's clock
 * and this one: `serverNow` was the server's time when it built the view, and `receivedAtMs` is
 * this client's time when the view arrived. Never negative. Null when the game has no deadline.
 */
export function remainingMs(
  deadlineUtc: string | null,
  serverNow: string,
  receivedAtMs: number,
  clientNowMs: number
): number | null {
  if (!deadlineUtc) return null;
  const offset = Date.parse(serverNow) - receivedAtMs; // server clock − client clock
  return Math.max(0, Date.parse(deadlineUtc) - (clientNowMs + offset));
}

/** "3:05" — rounded up, so the display reads 0:00 only when time is really up. */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** "B3" — a Tile's name on the board: its Column's letter and its 1-based position. */
export function tileLabel(view: AssociationGameView, tileId: number): string {
  for (const column of view.columns) {
    const tile = column.tiles.find((t) => t.id === tileId);
    if (tile) return `${column.letter}${tile.position + 1}`;
  }
  return "a tile";
}

export function targetLabel(target: GuessTarget): string {
  return target === "Final" ? "the final solution" : `column ${target}`;
}

/** Whether a Guess at this target can still be made: not solved, and the game still running. */
export function isOpenTarget(view: AssociationGameView, target: GuessTarget): boolean {
  if (view.isOver) return false;
  if (target === "Final") return !view.final.solved;
  return !view.columns.find((c) => c.letter === target)?.solved;
}

export const END_REASON_TEXT: Record<AssociationEndReason, string> = {
  FinalSolved: "You solved the final",
  TimeUp: "Time ran out",
  GaveUp: "You gave up",
  EndgameOver: "The endgame is over",
  Forfeit: "Forfeited",
  Abandoned: "Abandoned",
};

export type BreakdownRow = {
  label: string;
  solution: string | null;
  points: number;
  how: "guessed" | "with the final" | "unsolved";
};

/**
 * The score, line by line. A Column the Final collected is listed with what it was worth, but
 * those points are part of the Final's total (the server's FinalPoints), so the rows add up to
 * the score only when counted once: the "with the final" rows are shown for information and
 * `countsTowardScore` says which to sum.
 */
export function scoreBreakdown(view: AssociationGameView): (BreakdownRow & { countsTowardScore: boolean })[] {
  const columns = view.columns.map((column) => ({
    label: `Column ${column.letter}`,
    solution: column.solution,
    points: column.points ?? 0,
    how: !column.solved ? ("unsolved" as const) : column.viaFinal ? ("with the final" as const) : ("guessed" as const),
    countsTowardScore: column.solved && !column.viaFinal,
  }));
  return [
    ...columns,
    {
      label: "Final",
      solution: view.final.solution,
      points: view.final.points ?? 0,
      how: view.final.solved ? "guessed" : "unsolved",
      countsTowardScore: view.final.solved,
    },
  ];
}

/** One line of the move timeline on the results page. */
export function describeMove(view: AssociationGameView, move: AssociationMoveView): string {
  switch (move.kind) {
    case "OpenTile":
      return `Opened ${move.tileId != null ? tileLabel(view, move.tileId) : "a tile"}`;
    case "Guess": {
      const target = move.target ? targetLabel(move.target) : "a solution";
      const verdict = move.isCorrect ? `right, +${move.points}` : "wrong";
      return `Guessed “${move.guessText ?? ""}” for ${target} — ${verdict}`;
    }
    case "GiveUp":
      return "Gave up";
    case "Pass":
      return "Passed";
    case "TurnExpired":
      return "Ran out of time for the turn";
  }
}

/** Seconds into the game, "0:42" — the timeline's time column. */
export function elapsedLabel(view: AssociationGameView, at: string): string {
  const total = Math.floor(Math.max(0, Date.parse(at) - Date.parse(view.startedAt)) / 1000);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

export const COLUMN_TARGETS: ColumnLetter[] = ["A", "B", "C", "D"];
