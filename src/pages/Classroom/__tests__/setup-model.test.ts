import { describe, expect, it } from "vitest";
import { emptyTeamSeats, freshTeams, maxTeamsFor, moveStudent, resizeTeams, setupProblem, toStartInput } from "../host/setup-model";

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

  it("with a class, no team may be empty and there are never more teams than students", () => {
    const untimed = { timed: false } as const;
    const teams = freshTeams(4);
    teams[0].students = ["Arta"];
    teams[1].students = ["Blerim"];
    teams[2].students = ["Drita"];
    // No class: empty teams are just names.
    expect(setupProblem(freshTeams(4), untimed)).toBeNull();
    // A class of 4 split 1/1/1/0: the last team is called out by name.
    expect(setupProblem(teams, untimed, 4)).toMatch(/^Yellow has no students/);
    teams[3].students = ["Agon"];
    expect(setupProblem(teams, untimed, 4)).toBeNull();
    // Four teams for a class of three can't all have someone.
    expect(setupProblem(freshTeams(4), untimed, 3)).toMatch(/3 teams or fewer/);
    expect(setupProblem(freshTeams(2), untimed, 1)).toMatch(/at least 2 students/);
    expect([maxTeamsFor(null), maxTeamsFor(3), maxTeamsFor(30)]).toEqual([4, 3, 4]);
    // The cards mark every empty seat; without a class there are none to mark.
    const split = freshTeams(4);
    split[1].students = ["Arta"];
    expect(emptyTeamSeats(split, 5)).toEqual([0, 2, 3]);
    expect(emptyTeamSeats(split, null)).toEqual([]);
    expect(setupProblem(split, untimed, 5, { ignoreEmptyTeams: true })).toBeNull();
  });

  it("sends seconds, and both clocks or neither", () => {
    const input = toStartInput(7, null, freshTeams(2), { timed: true, minutes: 20, turnSeconds: 90 });
    expect([input.gameSeconds, input.turnSeconds]).toEqual([1200, 90]);
    const untimed = toStartInput(7, null, freshTeams(2), { timed: false });
    expect([untimed.gameSeconds, untimed.turnSeconds]).toEqual([null, null]);
  });
});
