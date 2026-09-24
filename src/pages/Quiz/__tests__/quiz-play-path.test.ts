import { quizPlayPath, sessionResultsPath } from "../quiz-play-path";

// Each format has its own play and results screens (docs/adr/0018-quiz-formats-are-separate-verticals.md);
// sending a board to the Classic ones is refused by the server, so the routing must not.
describe("quizPlayPath", () => {
  test("Classic plays at /quiz/:id/play", () => {
    expect(quizPlayPath({ id: 7, format: "Classic" })).toBe("/quiz/7/play");
    expect(quizPlayPath({ id: 7 })).toBe("/quiz/7/play");
  });

  test("a board plays at /associations/:id/play", () => {
    expect(quizPlayPath({ id: 7, format: "Associations" })).toBe("/associations/7/play");
  });

  test("the share grant travels with either", () => {
    expect(quizPlayPath({ id: 7, format: "Classic" }, "a b")).toBe("/quiz/7/play?shareToken=a%20b");
    expect(quizPlayPath({ id: 7, format: "Associations" }, "tok")).toBe("/associations/7/play?shareToken=tok");
  });
});

describe("sessionResultsPath", () => {
  test("routes a board play to its own results", () => {
    expect(sessionResultsPath({ id: "s1", format: "Associations" })).toBe("/associations/results/s1");
    expect(sessionResultsPath({ id: "s1", format: "Classic" })).toBe("/quiz/results/s1");
  });
});
