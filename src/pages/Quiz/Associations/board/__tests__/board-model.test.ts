import type { AssociationGameView, AssociationMoveView } from "@/types/association-types";
import {
  clockReadout,
  coachStep,
  describeMove,
  elapsedLabel,
  formatClock,
  isOpenTarget,
  remainingMs,
  scoreBreakdown,
  tileLabel,
} from "../board-model";

// The Associations screens only draw the server's view; these are the few things they derive
// from it. See docs/quiz/associations.md, "Playing".

const letters = ["A", "B", "C", "D"] as const;

function view(overrides: Partial<AssociationGameView> = {}): AssociationGameView {
  return {
    sessionId: "s",
    quizId: 1,
    quizTitle: "Italian cities",
    playStyle: "Solo",
    isOver: false,
    endReason: null,
    resumed: false,
    startedAt: "2026-09-23T12:00:00Z",
    endedAt: null,
    deadlineUtc: "2026-09-23T12:04:00Z",
    serverNow: "2026-09-23T12:00:00Z",
    boardSeconds: 240,
    score: 0,
    canOpen: true,
    canGuess: false,
    inEndgame: false,
    endgameTriesLeft: null,
    mySeat: 0,
    seats: [],
    winnerSeat: null,
    columns: letters.map((letter, c) => ({
      letter,
      tiles: [0, 1, 2, 3].map((position) => ({
        id: c * 4 + position + 1,
        position,
        isOpen: false,
        text: null,
        openedBySeat: null,
      })),
      solved: false,
      solution: null,
      points: null,
      solvedBySeat: null,
      viaFinal: false,
    })),
    final: { solved: false, solution: null, points: null, solvedBySeat: null },
    moves: [],
    ...overrides,
  };
}

describe("remainingMs", () => {
  test("counts down to the server's deadline", () => {
    const received = Date.parse("2026-09-23T12:00:00Z");
    expect(remainingMs("2026-09-23T12:04:00Z", "2026-09-23T12:00:00Z", received, received + 60_000)).toBe(180_000);
  });

  test("corrects for a client clock that runs 10 minutes fast", () => {
    const received = Date.parse("2026-09-23T12:10:00Z"); // client says 12:10 when the server says 12:00
    expect(remainingMs("2026-09-23T12:04:00Z", "2026-09-23T12:00:00Z", received, received)).toBe(240_000);
  });

  test("never goes below zero, and is null without a deadline", () => {
    const received = Date.parse("2026-09-23T12:00:00Z");
    expect(remainingMs("2026-09-23T12:04:00Z", "2026-09-23T12:00:00Z", received, received + 999_999)).toBe(0);
    expect(remainingMs(null, "2026-09-23T12:00:00Z", received, received)).toBeNull();
  });
});

describe("formatClock", () => {
  test("rounds up, so 0:00 means time is really up", () => {
    expect(formatClock(240_000)).toBe("4:00");
    expect(formatClock(65_001)).toBe("1:06");
    expect(formatClock(1)).toBe("0:01");
    expect(formatClock(0)).toBe("0:00");
  });
});

describe("clockReadout", () => {
  test("minutes and seconds from a minute up, plain seconds under it — as a Classic question shows them", () => {
    expect(clockReadout(240_000)).toEqual({ value: "4:00", unit: "min" });
    expect(clockReadout(59_001)).toEqual({ value: "1:00", unit: "min" });
    expect(clockReadout(59_000)).toEqual({ value: "59", unit: "sec" });
    expect(clockReadout(0)).toEqual({ value: "0", unit: "sec" });
  });
});

describe("labels", () => {
  test("a tile is named by its column and 1-based position", () => {
    expect(tileLabel(view(), 7)).toBe("B3");
  });

  test("the timeline says what each move did", () => {
    const v = view();
    expect(describeMove(v, { seq: 1, seat: 0, kind: "OpenTile", tileId: 13, target: null, guessText: null, isCorrect: null, points: 0, at: v.startedAt })).toBe("Opened D1");
    expect(describeMove(v, { seq: 2, seat: 0, kind: "Guess", tileId: null, target: "Final", guessText: "Italy", isCorrect: true, points: 37, at: v.startedAt })).toBe("Guessed “Italy” for the final solution — right, +37");
    expect(describeMove(v, { seq: 3, seat: 0, kind: "Guess", tileId: null, target: "C", guessText: "Rome", isCorrect: false, points: 0, at: v.startedAt })).toBe("Guessed “Rome” for column C — wrong");
  });

  test("elapsed time floors", () => {
    expect(elapsedLabel(view(), "2026-09-23T12:01:05.900Z")).toBe("1:05");
  });
});

describe("targets", () => {
  test("a solved column and a finished game take no guesses", () => {
    const v = view();
    v.columns[0].solved = true;
    expect(isOpenTarget(v, "A")).toBe(false);
    expect(isOpenTarget(v, "B")).toBe(true);
    expect(isOpenTarget({ ...v, isOver: true }, "B")).toBe(false);
  });

  test("the final takes a guess until it is solved", () => {
    const v = view();
    expect(isOpenTarget(v, "Final")).toBe(true);
    expect(isOpenTarget({ ...v, final: { ...v.final, solved: true } }, "Final")).toBe(false);
  });
});

describe("scoreBreakdown", () => {
  test("columns collected by the final are shown but counted once, inside the final", () => {
    const v = view({ score: 9 + 37 });
    v.columns[0] = { ...v.columns[0], solved: true, points: 9, solution: "Rome" };
    for (const c of [1, 2, 3]) v.columns[c] = { ...v.columns[c], solved: true, viaFinal: true, points: 9, solution: "x" };
    v.final = { solved: true, solution: "Italy", points: 37, solvedBySeat: 0 };

    const rows = scoreBreakdown(v);

    expect(rows.map((r) => r.how)).toEqual(["guessed", "with the final", "with the final", "with the final", "guessed"]);
    expect(rows.filter((r) => r.countsTowardScore).reduce((sum, r) => sum + r.points, 0)).toBe(v.score);
  });
});

describe("coachStep", () => {
  const move = (seq: number, overrides: Partial<AssociationMoveView>): AssociationMoveView => ({
    seq,
    seat: 0,
    kind: "OpenTile",
    tileId: null,
    target: null,
    guessText: null,
    isCorrect: null,
    points: 0,
    at: "2026-09-23T12:00:10Z",
    ...overrides,
  });

  test("before any tile is opened it points at the first closed tile", () => {
    expect(coachStep(view(), false)).toEqual({ kind: "tile", tileId: 1 });
  });

  test("once a tile is open and a guess earned, it points at that tile's column", () => {
    const v = view({ canGuess: true, moves: [move(1, { tileId: 6 })] });
    v.columns[1].tiles[1] = { ...v.columns[1].tiles[1], isOpen: true, text: "Colosseum" };
    expect(coachStep(v, false)).toEqual({ kind: "guess", target: "B" });
  });

  test("a solved column sends it to the next open target", () => {
    const v = view({ canGuess: true, moves: [move(1, { tileId: 1 })] });
    v.columns[0].solved = true;
    expect(coachStep(v, false)).toEqual({ kind: "guess", target: "B" });
  });

  test("the first guess, a dismissal or the end of the game ends it", () => {
    const guessed = view({
      canGuess: true,
      moves: [move(1, { tileId: 1 }), move(2, { kind: "Guess", target: "A", guessText: "x", isCorrect: false })],
    });
    expect(coachStep(guessed, false)).toBeNull();
    expect(coachStep(view(), true)).toBeNull();
    expect(coachStep(view({ isOver: true }), false)).toBeNull();
  });
});
