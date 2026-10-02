import { describe, expect, it } from "vitest";
import { freshTeams, moveStudent, resizeTeams, setupProblem, toStartInput } from "../host/setup-model";

describe("Host setup", () => {
  it("resizing to fewer teams puts the removed team's students back into play", () => {
    const teams = freshTeams(3);
    teams[2].students = ["Arta", "Blerim"];
    const two = resizeTeams(teams, 2);
    expect(two.flatMap((t) => t.students).sort()).toEqual(["Arta", "Blerim"]);
    expect(resizeTeams(two, 4).map((t) => t.name)).toEqual(["Red", "Blue", "Green", "Yellow"]);
  });

  it("moves a student between teams", () => {
    const teams = freshTeams(2);
    teams[0].students = ["Arta", "Dea"];
    expect(moveStudent(teams, 0, 1, 1).map((t) => t.students)).toEqual([["Arta"], ["Dea"]]);
  });

  it("refuses duplicate names and out-of-range clocks", () => {
    const teams = freshTeams(2);
    teams[1].name = " red ";
    expect(setupProblem(teams, { timed: false })).toMatch(/same name/);
    expect(setupProblem(freshTeams(2), { timed: true, minutes: 2, turnSeconds: 60 })).toMatch(/5 to 60/);
    expect(setupProblem(freshTeams(2), { timed: true, minutes: 20, turnSeconds: 60 })).toBeNull();
  });

  it("sends seconds, and both clocks or neither", () => {
    const input = toStartInput(7, null, freshTeams(2), { timed: true, minutes: 20, turnSeconds: 90 });
    expect([input.gameSeconds, input.turnSeconds]).toEqual([1200, 90]);
    const untimed = toStartInput(7, null, freshTeams(2), { timed: false });
    expect([untimed.gameSeconds, untimed.turnSeconds]).toEqual([null, null]);
  });
});
