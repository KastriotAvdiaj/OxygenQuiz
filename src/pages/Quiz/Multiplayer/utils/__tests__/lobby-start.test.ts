import { describe, expect, test } from "vitest";
import { isDuelPick, startBlockedReason } from "../lobby-start";

// Why the host's Start is disabled — one rule for the button and for the sentence under it.
// The server re-checks all of it (docs/quiz/multiplayer.md §4.3); this is fast feedback.

const player = (username: string, isReady = true) => ({ username, isReady, isHost: false });

describe("startBlockedReason", () => {
  test("a classic quiz starts with two or more players, all ready", () => {
    const quiz = { id: "1", title: "Capitals", format: "Classic" as const };
    expect(startBlockedReason({ participants: [player("ana")], selectedQuiz: quiz })).toBe("Waiting for more players…");
    expect(startBlockedReason({ participants: [player("ana"), player("ben"), player("cleo")], selectedQuiz: quiz })).toBeNull();
    expect(startBlockedReason({ participants: [player("ana"), player("ben", false)], selectedQuiz: quiz })).toBe(
      "Waiting for 1 player to ready up…",
    );
  });

  test("a board is a duel: exactly two players", () => {
    const board = { id: "2", title: "Oxygen final", format: "Associations" as const };
    expect(startBlockedReason({ participants: [player("ana")], selectedQuiz: board })).toBe("Waiting for an opponent…");
    expect(startBlockedReason({ participants: [player("ana"), player("ben")], selectedQuiz: board })).toBeNull();
    expect(
      startBlockedReason({ participants: [player("ana"), player("ben"), player("cleo")], selectedQuiz: board }),
    ).toBe("A board is a duel for exactly 2 players — one too many in the room.");
    expect(
      startBlockedReason({
        participants: [player("ana"), player("ben"), player("cleo"), player("dan")],
        selectedQuiz: board,
      }),
    ).toBe("A board is a duel for exactly 2 players — 2 too many in the room.");
  });

  test("the player count is checked before readiness", () => {
    const board = { id: "2", title: "Oxygen final", format: "Associations" as const };
    expect(
      startBlockedReason({ participants: [player("ana"), player("ben", false), player("cleo", false)], selectedQuiz: board }),
    ).toMatch(/exactly 2 players/);
  });

  test("nothing starts without a pick", () => {
    expect(startBlockedReason({ participants: [player("ana"), player("ben")], selectedQuiz: null })).toBe(
      "Pick a quiz to get started",
    );
  });

  test("a pick with no format yet (an older server) is treated as classic", () => {
    expect(isDuelPick({ id: "1", title: "Capitals" })).toBe(false);
    expect(isDuelPick({ id: "1", title: "Board", format: "Associations" })).toBe(true);
    expect(isDuelPick(null)).toBe(false);
  });
});
