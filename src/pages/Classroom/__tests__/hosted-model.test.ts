import { describe, expect, it } from "vitest";
import type { HostedGameView, HostedTeam } from "../api/hosted-games";
import { clockMs, hostedPrompt, rankTeams, shuffleIntoTeams, winnerLine } from "../host/hosted-model";

const team = (seat: number, name: string, score: number): HostedTeam => ({
  seat, name, colour: "red", students: [], score, endgameTurnsLeft: null,
});

describe("rankTeams / winnerLine", () => {
  it("ranks by score and calls a tie a tie", () => {
    const ranked = rankTeams([team(0, "Red", 10), team(1, "Blue", 20), team(2, "Green", 10)]);
    expect(ranked.map((t) => [t.name, t.rank, t.tied])).toEqual([
      ["Blue", 1, false],
      ["Red", 2, true],
      ["Green", 2, true],
    ]);
    expect(winnerLine([team(0, "Red", 10), team(1, "Blue", 20)])).toBe("Blue wins");
    expect(winnerLine([team(0, "Red", 5), team(1, "Blue", 5), team(2, "Green", 5)])).toBe(
      "Red, Blue and Green share first place",
    );
  });
});

describe("shuffleIntoTeams", () => {
  it("spreads everyone as evenly as possible and loses nobody", () => {
    const students = ["a", "b", "c", "d", "e", "f", "g"];
    const teams = shuffleIntoTeams(students, 3, () => 0.42);
    expect(teams.map((t) => t.length)).toEqual([3, 2, 2]);
    expect(teams.flat().sort()).toEqual(students);
  });
});

describe("hostedPrompt", () => {
  const view = (patch: Partial<HostedGameView>) =>
    ({ isOver: false, isPaused: false, canOpen: false, inEndgame: false, currentSeat: 1,
       teams: [team(0, "Red", 0), team(1, "Blue", 0)], ...patch }) as HostedGameView;

  it("names the team and what it may do", () => {
    expect(hostedPrompt(view({ canOpen: true }))).toBe("Blue: open a tile.");
    expect(hostedPrompt(view({}))).toBe("Blue: guess a column or the final — or pass.");
    expect(hostedPrompt(view({ isPaused: true, canOpen: true }))).toBe("Paused");
  });
});

describe("clockMs", () => {
  it("counts to the server's deadline, corrected for clock offset", () => {
    // The server is 2 s ahead of this browser; the deadline is 10 s after the server's now.
    expect(clockMs("2026-10-02T10:00:10Z", null, "2026-10-02T10:00:00Z", 1_000, 1_000 + 3_000)).toBe(7_000);
  });
  it("is frozen while paused", () => {
    expect(clockMs(null, 20, "2026-10-02T10:00:00Z", 0, 999_999)).toBe(20_000);
  });
});
