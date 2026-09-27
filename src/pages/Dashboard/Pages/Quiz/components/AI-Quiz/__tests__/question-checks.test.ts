import { describe, expect, it } from "vitest";
import { QuestionType, type QuestionDifficulty } from "@/types/question-types";

import { parseAiOutput, type ParseContext } from "../parse-ai-output";
import {
  checkQuoteInSource,
  findDuplicateOptions,
  givesAwayAnswer,
  normalizeForMatch,
} from "../question-checks";

describe("normalizeForMatch", () => {
  it("folds case, diacritics, curly quotes, dashes and whitespace", () => {
    expect(normalizeForMatch("  “Tiranë” — the\nCapital! ")).toBe("tirane the capital");
  });

  it("keeps letters and digits from any script", () => {
    expect(normalizeForMatch("Ελλάδα 1821")).toBe("ελλαδα 1821");
  });
});

describe("findDuplicateOptions", () => {
  it("finds options that differ only in case, spacing or punctuation", () => {
    const options = [
      { text: "Paris", isCorrect: true },
      { text: "Lyon", isCorrect: false },
      { text: " paris. ", isCorrect: false },
    ];
    expect(findDuplicateOptions(options)).toEqual(["paris."]);
  });

  it("returns nothing when every option is distinct", () => {
    expect(
      findDuplicateOptions([
        { text: "1914", isCorrect: true },
        { text: "1918", isCorrect: false },
      ]),
    ).toEqual([]);
  });
});

describe("givesAwayAnswer", () => {
  it("flags an answer written in the question", () => {
    expect(givesAwayAnswer("What is Harry Potter's surname?", "Potter")).toBe(true);
  });

  it("matches whole words only", () => {
    // "art" is inside "started", not a word of it.
    expect(givesAwayAnswer("When was the war started?", "art")).toBe(false);
  });

  it("does not flag a question that names every option", () => {
    expect(
      givesAwayAnswer("Is a whale a mammal or a fish?", "mammal", ["fish"]),
    ).toBe(false);
  });

  it("ignores answers too short to mean anything", () => {
    expect(givesAwayAnswer("What is the symbol for gold, Au or Ag?", "Au")).toBe(false);
  });
});

describe("checkQuoteInSource", () => {
  const source =
    "The Treaty of Versailles was signed on 28 June 1919.\nIt ended the state of war between Germany and the Allies.";

  it("finds a verbatim quote despite punctuation and line breaks", () => {
    expect(
      checkQuoteInSource("It ended the state of war between Germany and the Allies", source),
    ).toBe("found");
  });

  it("accepts an ellipsis when the fragments appear in order", () => {
    expect(
      checkQuoteInSource("The Treaty of Versailles … 28 June 1919", source),
    ).toBe("found");
  });

  it("rejects fragments that appear out of order", () => {
    expect(
      checkQuoteInSource("28 June 1919 ... The Treaty of Versailles", source),
    ).toBe("not-found");
  });

  it("rejects a quote with an invented detail", () => {
    expect(
      checkQuoteInSource("The Treaty of Versailles was signed on 11 November 1918", source),
    ).toBe("not-found");
  });

  it("treats a quote under the minimum length as no evidence", () => {
    expect(checkQuoteInSource("Versailles", source)).toBe("too-short");
  });
});

describe("parseAiOutput quality checks", () => {
  const difficulties = [
    { id: 2, level: "Easy", weight: 1 },
  ] as unknown as QuestionDifficulty[];

  const ctx: ParseContext = {
    categoryId: 5,
    languageId: 7,
    quizDifficultyId: 2,
    difficulties,
  };

  const reply = (questions: unknown[]) => JSON.stringify({ questions });

  const mc = (text: string, options: [string, boolean][], extra: object = {}) => ({
    type: QuestionType.MultipleChoice,
    text,
    difficulty: "Easy",
    answerOptions: options.map(([t, isCorrect]) => ({ text: t, isCorrect })),
    ...extra,
  });

  it("drops a multiple-choice question with the same option twice", () => {
    const result = parseAiOutput(
      reply([
        mc("Capital of France?", [["Paris", true], ["paris", false], ["Lyon", false]]),
        mc("Capital of Italy?", [["Rome", true], ["Milan", false]]),
      ]),
      ctx,
    );
    expect(result.questions).toHaveLength(1);
    expect(result.dropped[0].reason).toMatch(/same answer option twice/);
  });

  it("drops a question whose key contradicts allowMultipleSelections", () => {
    const result = parseAiOutput(
      reply([
        mc("Largest ocean?", [["Pacific", true], ["Atlantic", true]], {
          allowMultipleSelections: false,
        }),
        mc("Capital of Italy?", [["Rome", true], ["Milan", false]]),
      ]),
      ctx,
    );
    expect(result.dropped.map((d) => d.index)).toEqual([1]);
  });

  it("drops a typed-answer question that gives the answer away", () => {
    const result = parseAiOutput(
      reply([
        {
          type: QuestionType.TypeTheAnswer,
          text: "What is Harry Potter's surname?",
          correctAnswer: "Potter",
        },
        mc("Capital of Italy?", [["Rome", true], ["Milan", false]]),
      ]),
      ctx,
    );
    expect(result.dropped[0].reason).toMatch(/gives the answer away/);
  });

  it("drops a repeated question but keeps the first copy", () => {
    const result = parseAiOutput(
      reply([
        mc("Capital of Italy?", [["Rome", true], ["Milan", false]]),
        mc("capital of italy", [["Rome", true], ["Turin", false]]),
      ]),
      ctx,
    );
    expect(result.questions).toHaveLength(1);
    expect(result.dropped).toEqual([
      expect.objectContaining({ index: 2, reason: "repeats an earlier question" }),
    ]);
  });

  it("does not let a broken first copy block a good repeat", () => {
    const result = parseAiOutput(
      reply([
        mc("Capital of Italy?", [["Rome", false], ["Milan", false]]),
        mc("Capital of Italy?", [["Rome", true], ["Milan", false]]),
      ]),
      ctx,
    );
    expect(result.questions).toHaveLength(1);
    expect(result.dropped[0].reason).toMatch(/no answer option was marked correct/);
  });

  describe("with source material", () => {
    const sourceText =
      "Photosynthesis converts light energy into chemical energy stored in glucose.";

    it("drops a question whose quote is not in the source", () => {
      const result = parseAiOutput(
        reply([
          mc("What does photosynthesis store energy in?", [["Glucose", true], ["Starch", false]], {
            sourceQuote: "Photosynthesis stores energy in starch granules",
          }),
          mc("What does photosynthesis convert?", [["Light energy", true], ["Heat", false]], {
            sourceQuote: "Photosynthesis converts light energy into chemical energy",
          }),
        ]),
        { ...ctx, sourceText },
      );
      expect(result.questions).toHaveLength(1);
      expect(result.dropped[0].reason).toMatch(/isn't in your source material/);
    });

    it("keeps a question with no quote at all", () => {
      const result = parseAiOutput(
        reply([mc("What does photosynthesis produce?", [["Glucose", true], ["Salt", false]])]),
        { ...ctx, sourceText },
      );
      expect(result.ok).toBe(true);
      expect(result.dropped).toEqual([]);
    });

    it("skips the quote check in Topic mode", () => {
      const result = parseAiOutput(
        reply([
          mc("What does photosynthesis store energy in?", [["Glucose", true], ["Salt", false]], {
            sourceQuote: "a sentence that exists nowhere at all",
          }),
        ]),
        ctx,
      );
      expect(result.ok).toBe(true);
    });
  });
});

describe("parseAiOutput explanations", () => {
  const ctx: ParseContext = {
    categoryId: 5,
    languageId: 7,
    quizDifficultyId: 2,
    difficulties: [{ id: 2, level: "Easy", weight: 1 }] as unknown as QuestionDifficulty[],
  };

  const tf = (extra: object) =>
    JSON.stringify({
      questions: [
        { type: QuestionType.TrueFalse, text: "Water boils at 100°C at sea level.", correctAnswer: true, ...extra },
      ],
    });

  it("carries the model's explanation onto the question, trimmed", () => {
    const result = parseAiOutput(tf({ explanation: "  At 1 atm, water's boiling point is 100°C.  " }), ctx);
    expect(result.questions[0].question.explanation).toBe("At 1 atm, water's boiling point is 100°C.");
  });

  it("treats a missing explanation as none, not as an error", () => {
    const result = parseAiOutput(tf({}), ctx);
    expect(result.ok).toBe(true);
    expect(result.questions[0].question.explanation).toBe("");
  });

  it("cuts an over-long explanation instead of dropping the question", () => {
    const result = parseAiOutput(tf({ explanation: "x".repeat(1200) }), ctx);
    expect(result.dropped).toEqual([]);
    expect(result.questions[0].question.explanation).toHaveLength(1000);
  });
});
