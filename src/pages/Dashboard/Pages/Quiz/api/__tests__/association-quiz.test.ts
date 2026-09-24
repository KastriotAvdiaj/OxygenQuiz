import {
  associationQuizFormSchema,
  emptyAssociationQuizFormValues,
  splitSpellings,
  toAssociationQuizFormValues,
  toAssociationQuizPayload,
  type AssociationQuizFormValues,
} from "../association-quiz";
import { dashboardBaseOf, quizEditPath } from "../../quiz-paths";
import type { AssociationBoardDTO } from "@/types/association-types";
import type { Quiz } from "@/types/quiz-types";

// The builder's form ↔ request mapping, and the client-side mirror of the API's board rules.
// The API (AssociationBoardValidator) is the gate; these pin that the mirror and the mapping
// don't lose or reorder anything. See docs/quiz/associations.md, "Authoring".

const filled = (): AssociationQuizFormValues => ({
  title: "  Italian cities ",
  description: "",
  categoryId: 1,
  languageId: 2,
  difficultyId: 3,
  status: "Draft",
  boardTimeInSeconds: 240,
  columns: ["A", "B", "C", "D"].map((letter) => ({
    tiles: [1, 2, 3, 4].map((i) => ` ${letter}${i} `),
    solution: ` ${letter} `,
    otherSpellings: "",
  })),
  finalSolution: "Italy",
  finalOtherSpellings: "Italia, , Italien",
});

describe("splitSpellings", () => {
  test("splits on commas, trims, drops blanks", () => {
    expect(splitSpellings(" Roma , ,Rom ")).toEqual(["Roma", "Rom"]);
    expect(splitSpellings("")).toEqual([]);
    expect(splitSpellings(undefined)).toEqual([]);
  });
});

describe("toAssociationQuizPayload", () => {
  test("keeps column and tile order, trims, and turns spellings into lists", () => {
    const payload = toAssociationQuizPayload(filled());

    expect(payload.title).toBe("Italian cities");
    expect(payload.board.columns.map((c) => c.solution)).toEqual(["A", "B", "C", "D"]);
    expect(payload.board.columns[2].tiles).toEqual(["C1", "C2", "C3", "C4"]);
    expect(payload.board.finalAcceptableSolutions).toEqual(["Italia", "Italien"]);
    expect(payload.boardTimeInSeconds).toBe(240);
  });
});

describe("toAssociationQuizFormValues", () => {
  test("a stored board comes back in board order, whatever order the tiles arrive in", () => {
    const board: AssociationBoardDTO = {
      quizId: 7,
      version: 3,
      boardTimeInSeconds: 300,
      columns: (["A", "B", "C", "D"] as const).map((letter, c) => ({
        letter,
        solution: `${letter}!`,
        acceptableSolutions: c === 0 ? ["Roma", "Rom"] : [],
        tiles: [3, 1, 0, 2].map((position) => ({ id: c * 10 + position, position, text: `${letter}${position + 1}` })),
      })),
      finalSolution: "Italy",
      finalAcceptableSolutions: [],
    };
    const quiz = {
      title: "t",
      description: undefined,
      category: { id: 1 },
      language: { id: 2 },
      difficulty: { id: 3 },
      status: "Unlisted",
    } as unknown as Quiz;

    const values = toAssociationQuizFormValues(quiz, board);

    expect(values.columns[0].tiles).toEqual(["A1", "A2", "A3", "A4"]);
    expect(values.columns[0].otherSpellings).toBe("Roma, Rom");
    expect(values.boardTimeInSeconds).toBe(300);
    expect(values.status).toBe("Unlisted");
    // And it survives the trip back.
    expect(toAssociationQuizPayload(values).board.columns[0].acceptableSolutions).toEqual(["Roma", "Rom"]);
  });
});

describe("associationQuizFormSchema (mirror of the API's rules)", () => {
  test("a complete board passes", () => {
    expect(associationQuizFormSchema.safeParse(filled()).success).toBe(true);
  });

  test("the empty create form does not — every tile and solution is required", () => {
    const empty = { ...emptyAssociationQuizFormValues(), categoryId: 1, languageId: 1, difficultyId: 1 };
    const result = associationQuizFormSchema.safeParse(empty);
    expect(result.success).toBe(false);
  });

  test("a blank tile is reported at its own path", () => {
    const values = filled();
    values.columns[1].tiles[2] = "   ";
    const result = associationQuizFormSchema.safeParse(values);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join(".") === "columns.1.tiles.2")).toBe(true);
    }
  });

  test("board time outside 60–600 is refused", () => {
    expect(associationQuizFormSchema.safeParse({ ...filled(), boardTimeInSeconds: 30 }).success).toBe(false);
    expect(associationQuizFormSchema.safeParse({ ...filled(), boardTimeInSeconds: 601 }).success).toBe(false);
  });

  test("more than four other spellings is refused", () => {
    expect(associationQuizFormSchema.safeParse({ ...filled(), finalOtherSpellings: "a,b,c,d,e" }).success).toBe(false);
  });
});

describe("quizEditPath", () => {
  test("each format opens its own editor", () => {
    expect(quizEditPath({ id: 5, format: "Classic" })).toBe("/dashboard/quizzes/edit-quiz/5");
    expect(quizEditPath({ id: 5, format: "Associations" })).toBe("/dashboard/quizzes/edit-quiz/5/board");
  });

  test("owners edit from the player dashboard, under its own paths", () => {
    expect(quizEditPath({ id: 5, format: "Classic" }, "/my-dashboard")).toBe("/my-dashboard/quizzes/edit/5");
    expect(quizEditPath({ id: 5, format: "Associations" }, "/my-dashboard")).toBe("/my-dashboard/quizzes/edit/5/board");
  });

  test("the dashboard is read off the current path", () => {
    expect(dashboardBaseOf("/my-dashboard/quizzes")).toBe("/my-dashboard");
    expect(dashboardBaseOf("/dashboard/quizzes/edit-quiz/3")).toBe("/dashboard");
  });
});
