import { describe, expect, it } from "vitest";

import { QuestionType, type QuestionDifficulty } from "@/types/question-types";
import { parseAiOutput } from "../../../../AI-Quiz/parse-ai-output";
import { UnspecifiedIds } from "../../../constants";
import { buildPasteFormat } from "../paste-format";

const difficulty = (id: number, level: string): QuestionDifficulty =>
  ({ id, level, weight: id, createdAt: "" }) as QuestionDifficulty;
const difficulties = [difficulty(1, "Unspecified"), difficulty(2, "Easy"), difficulty(3, "Hard")];

const ctx = {
  categoryId: UnspecifiedIds.categoryId,
  languageId: UnspecifiedIds.languageId,
  quizDifficultyId: UnspecifiedIds.difficultyId,
  difficulties,
};

/**
 * The format a user hands their own AI is parsed by `parseAiOutput` (the own-AI path's parser). If
 * the example in the format ever stops parsing, every user's AI would copy a shape the app rejects
 * — so the example is the test.
 */
describe("buildPasteFormat", () => {
  it("contains an example the parser reads in full — one question of each type", () => {
    const result = parseAiOutput(buildPasteFormat(difficulties), ctx);

    expect(result.ok).toBe(true);
    expect(result.dropped).toEqual([]);
    expect(result.questions.map((q) => q.question.type)).toEqual([
      QuestionType.MultipleChoice,
      QuestionType.TrueFalse,
      QuestionType.TypeTheAnswer,
    ]);
  });

  it("names the real difficulties, never Unspecified", () => {
    const format = buildPasteFormat(difficulties);

    expect(format).toContain('"Easy", "Hard"');
    expect(format).not.toContain('"Unspecified"');
  });

  it("parses into private drafts", () => {
    const result = parseAiOutput(buildPasteFormat(difficulties), ctx);

    expect(result.questions.every((q) => q.question.visibility === "Private")).toBe(true);
    expect(result.questions.every((q) => q.question.id < 0)).toBe(true);
  });
});
