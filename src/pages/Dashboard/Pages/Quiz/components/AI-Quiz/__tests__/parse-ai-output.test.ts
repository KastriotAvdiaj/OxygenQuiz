import { describe, expect, it } from "vitest";

import { QuestionType } from "@/types/question-types";
import { TIME_LIMIT_VALUES } from "../../Create-Quiz-Form/constants";
import { parseAiOutput } from "../parse-ai-output";
import { parseContext } from "../__fixtures__/ai-quiz.fixtures";

/**
 * The trust boundary between a language model and the quiz builder.
 *
 * Everything the AI wizard produces — generated in the app or pasted from the user's own model —
 * passes through `parseAiOutput` before a person sees it. The model's reply is a proposal (the
 * principle ADR 0003 names for palettes; the parser's guarantees are in
 * docs/quiz/ai-quiz-architecture.md §4). These tests pin the decisions the code keeps for itself —
 * where a question is filed, how it is graded, what a time limit may be — and that one bad
 * question costs that question, not the whole generation.
 */

const reply = (questions: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ ...extra, questions });

const mc = {
  type: QuestionType.MultipleChoice,
  text: "Which process turns water vapour back into liquid?",
  difficulty: "Easy",
  answerOptions: [
    { text: "Condensation", isCorrect: true },
    { text: "Evaporation", isCorrect: false },
  ],
};

describe("parseAiOutput", () => {
  it("finds the JSON inside a chatty, code-fenced reply", () => {
    const raw = `Sure! Here's your quiz:\n\n\`\`\`json\n${reply([mc])}\n\`\`\`\n\nWant more?`;

    const result = parseAiOutput(raw, parseContext);

    expect(result.ok).toBe(true);
    expect(result.questions).toHaveLength(1);
  });

  it("files every question under the quiz's category and language, whatever the model says", () => {
    const result = parseAiOutput(
      reply([{ ...mc, categoryId: 99, languageId: 99, category: "Sports" }], {
        category: "Sports",
      }),
      parseContext,
    );

    const { question } = result.questions[0];
    expect(question.categoryId).toBe(parseContext.categoryId);
    expect(question.languageId).toBe(parseContext.languageId);
    // Generated questions start private; publishing is the author's call.
    expect(question.visibility).toBe("Private");
  });

  it("never lets the model switch on partial matching for a typed answer", () => {
    const result = parseAiOutput(
      reply([
        {
          type: QuestionType.TypeTheAnswer,
          text: "What is the name for water falling from clouds?",
          correctAnswer: "  Precipitation ",
          acceptableAnswers: ["rain", "  ", "rainfall"],
          allowPartialMatch: true,
        },
      ]),
      parseContext,
    );

    const question = result.questions[0].question;
    expect(question.type).toBe(QuestionType.TypeTheAnswer);
    if (question.type !== QuestionType.TypeTheAnswer) return;
    expect(question.allowPartialMatch).toBe(false);
    expect(question.correctAnswer).toBe("Precipitation");
    // Blank alternatives would match an empty submission; they are dropped, not kept.
    expect(question.acceptableAnswers).toEqual([{ value: "rain" }, { value: "rainfall" }]);
  });

  it("drops only the unusable questions, and says why", () => {
    const result = parseAiOutput(
      reply([
        mc,
        { ...mc, text: "One option only", answerOptions: [{ text: "A", isCorrect: true }] },
        {
          ...mc,
          text: "Nothing correct",
          answerOptions: [
            { text: "A", isCorrect: false },
            { text: "B", isCorrect: false },
          ],
        },
        { type: QuestionType.TrueFalse, text: "Is water wet?", correctAnswer: "maybe" },
      ]),
      parseContext,
    );

    expect(result.ok).toBe(true);
    expect(result.questions).toHaveLength(1);
    expect(result.dropped.map((d) => [d.index, d.reason])).toEqual([
      [2, "needs 2–4 answer options (got 1)"],
      [3, "no answer option was marked correct"],
      [4, "correctAnswer must be true or false"],
    ]);
  });

  it("snaps a time limit to one the builder can show, within the allowed range", () => {
    const result = parseAiOutput(
      reply([
        { ...mc, timeLimitInSeconds: 22 },
        { ...mc, timeLimitInSeconds: 9000 },
        { ...mc, timeLimitInSeconds: -4 },
      ]),
      parseContext,
    );

    const limits = result.questions.map((q) => q.settings.timeLimitInSeconds);
    expect(limits[0]).toBe(20);
    for (const seconds of limits) expect(TIME_LIMIT_VALUES).toContain(seconds);
  });

  it("maps difficulty by name only, falling back to the quiz's own", () => {
    const result = parseAiOutput(
      reply([
        { ...mc, difficulty: "hard" },
        { ...mc, difficulty: "Legendary" },
      ]),
      parseContext,
    );

    expect(result.questions[0].question.difficultyId).toBe(3);
    expect(result.questions[1].question.difficultyId).toBe(parseContext.quizDifficultyId);
    // Reported, so the review screen can say which ones it guessed.
    expect(result.difficultyFallbacks).toEqual([2]);
  });

  it("fails with a message the user can act on when nothing usable came back", () => {
    const noJson = parseAiOutput("I'm sorry, I can't help with that.", parseContext);
    expect(noJson.ok).toBe(false);
    expect(noJson.error).toMatch(/Couldn't find any JSON/);

    const allBad = parseAiOutput(
      reply([{ type: QuestionType.TrueFalse, text: "?", correctAnswer: "perhaps" }]),
      parseContext,
    );
    expect(allBad.ok).toBe(false);
    expect(allBad.dropped).toHaveLength(1);
    expect(allBad.error).toMatch(/None of the generated questions were usable/);
  });
});
