import { describe, expect, test } from "vitest";
import type { AssociationMoveView, DuelView } from "@/types/association-types";
import { DUEL_END_REASON_TEXT, describeDuelMove, duelOutcome, mySeatIn, turnPrompt } from "../duel-model";

// What the Duel screen derives from the server's view (docs/quiz/associations.md §10). The rules
// are the server's; these only say them from where the reader sits.

const letters = ["A", "B", "C", "D"] as const;

function view(overrides: Partial<DuelView> = {}): DuelView {
  return {
    quizId: 1,
    quizTitle: "Oxygen final",
    seats: [
      { seat: 0, username: "ana", score: 0 },
      { seat: 1, username: "ben", score: 0 },
    ],
    firstSeat: 0,
    currentSeat: 0,
    turnDeadlineUtc: "2026-09-25T18:00:30Z",
    serverNow: "2026-09-25T18:00:00Z",
    turnSeconds: 30,
    canOpen: true,
    canGuess: false,
    canPass: false,
    inEndgame: false,
    isOver: false,
    endReason: null,
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

const move = (overrides: Partial<AssociationMoveView>): AssociationMoveView => ({
  seq: 1,
  seat: 0,
  kind: "OpenTile",
  tileId: null,
  target: null,
  guessText: null,
  isCorrect: null,
  points: 0,
  at: "2026-09-25T18:00:05Z",
  ...overrides,
});

describe("mySeatIn", () => {
  test("finds the reader's seat by username, ignoring case", () => {
    expect(mySeatIn(view(), "BEN")).toBe(1);
    expect(mySeatIn(view(), "cleo")).toBeNull();
  });
});

describe("turnPrompt", () => {
  test("on your turn it says what the turn allows", () => {
    expect(turnPrompt(view(), 0)).toBe("Your turn — open a tile.");
    expect(turnPrompt(view({ canOpen: false, canGuess: true, canPass: true }), 0)).toBe(
      "Guess any column or the final — or pass.",
    );
  });

  test("in the endgame it counts the turns left", () => {
    const endgame = view({
      canOpen: false,
      canGuess: true,
      canPass: true,
      inEndgame: true,
      seats: [
        { seat: 0, username: "ana", score: 0, endgameTurnsLeft: 1 },
        { seat: 1, username: "ben", score: 0, endgameTurnsLeft: 2 },
      ],
    });
    expect(turnPrompt(endgame, 0)).toBe("Every tile is open — guess or pass. 1 more turn after this one.");
    expect(turnPrompt({ ...endgame, seats: endgame.seats.map((s) => ({ ...s, endgameTurnsLeft: 0 })) }, 0)).toBe(
      "Every tile is open — guess or pass. This is your last turn.",
    );
  });

  test("on the other player's turn it names them", () => {
    expect(turnPrompt(view({ currentSeat: 1 }), 0)).toBe("ben's turn.");
  });

  test("a spectator is told whose turn it is too", () => {
    expect(turnPrompt(view({ currentSeat: 1 }), null)).toBe("ben's turn.");
  });

  test("nothing once it's over", () => {
    expect(turnPrompt(view({ isOver: true, currentSeat: null }), 0)).toBeNull();
  });
});

describe("duelOutcome", () => {
  test("the winner and the loser each read their own result", () => {
    const over = view({ isOver: true, currentSeat: null, endReason: "FinalSolved", winnerSeat: 1 });
    expect(duelOutcome(over, 1)).toBe("You won");
    expect(duelOutcome(over, 0)).toBe("ben won");
  });

  test("a forfeit says why", () => {
    const forfeit = view({ isOver: true, currentSeat: null, endReason: "Forfeit", winnerSeat: 1 });
    expect(duelOutcome(forfeit, 1)).toBe("ana left — you win");
  });

  test("the one who left reads who won", () => {
    const forfeit = view({ isOver: true, currentSeat: null, endReason: "Forfeit", winnerSeat: 1 });
    expect(duelOutcome(forfeit, 0)).toBe("ben won");
  });

  test("the ending is said to both players, not to one", () => {
    expect(DUEL_END_REASON_TEXT.FinalSolved).toBe("The final solution was found");
    expect(DUEL_END_REASON_TEXT.EndgameOver).toBe("The endgame ran out");
  });

  test("equal scores are a tie", () => {
    expect(duelOutcome(view({ isOver: true, currentSeat: null, endReason: "EndgameOver", winnerSeat: null }), 0)).toBe(
      "A tie",
    );
  });
});

describe("describeDuelMove", () => {
  test("names who did what", () => {
    const v = view();
    expect(describeDuelMove(v, move({ kind: "OpenTile", tileId: 6 }))).toBe("ana opened B2");
    expect(
      describeDuelMove(v, move({ seat: 1, kind: "Guess", target: "C", guessText: "Tea", isCorrect: true, points: 8 })),
    ).toBe("ben guessed “Tea” for column C — right, +8");
    expect(describeDuelMove(v, move({ kind: "Guess", target: "Final", guessText: "Rome", isCorrect: false }))).toBe(
      "ana guessed “Rome” for the final solution — wrong",
    );
    expect(describeDuelMove(v, move({ kind: "Pass" }))).toBe("ana passed");
    expect(describeDuelMove(v, move({ seat: 1, kind: "TurnExpired" }))).toBe("ben ran out of time");
  });
});
