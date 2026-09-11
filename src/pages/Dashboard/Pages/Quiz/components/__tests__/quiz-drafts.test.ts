import { describe, expect, it } from "vitest";

import { QuestionType } from "@/types/question-types";

import {
  AiQuizDraft,
  ManualQuizDraft,
  isAiQuizDraftWorthKeeping,
  isManualQuizDraftWorthKeeping,
  parseAiQuizDraft,
  parseManualQuizDraft,
} from "../quiz-drafts";

/**
 * Two things decide whether draft persistence helps or annoys, and both live in this file.
 *
 * "Worth keeping" is the one that annoys when it is wrong: answer `true` for an untouched
 * form and every visit to the builder opens with an offer to restore work nobody did, which
 * is how a notice becomes something people click past without reading. The defaults the form
 * opens with — Draft status, no time limit, the switches off — are therefore not evidence of
 * anything.
 *
 * The parsers are the one that breaks when it is wrong: they stand between stored JSON,
 * which is untrusted, and a form that will happily render whatever it is handed.
 */

/** A builder nobody has typed into yet: react-hook-form's defaults and no questions. */
const untouchedManualDraft = (): ManualQuizDraft => ({
  form: {
    title: "",
    description: "",
    imageUrl: "",
    timeLimitInSeconds: 0,
    showFeedbackImmediately: false,
    status: "Draft",
    shuffleQuestions: false,
  },
  questions: [],
});

const untouchedAiDraft = (): AiQuizDraft => ({
  topic: "",
  sourceData: "",
  title: "",
  description: "",
  categoryId: null,
  languageId: null,
  difficultyId: null,
  questionCount: 10,
  allowedTypes: [QuestionType.MultipleChoice],
  extraInstructions: "",
  pastedReply: "",
  payload: null,
});

describe("is a manual quiz draft worth keeping", () => {
  it("says no to a form that has only its defaults in it", () => {
    expect(isManualQuizDraftWorthKeeping(untouchedManualDraft())).toBe(false);
  });

  it("says no to whitespace, which is not something anyone would miss", () => {
    const draft = untouchedManualDraft();
    draft.form.title = "   ";
    expect(isManualQuizDraftWorthKeeping(draft)).toBe(false);
  });

  it("says yes as soon as a title is typed", () => {
    const draft = untouchedManualDraft();
    draft.form.title = "Capitals of Europe";
    expect(isManualQuizDraftWorthKeeping(draft)).toBe(true);
  });

  it("says yes as soon as a lookup is chosen", () => {
    const draft = untouchedManualDraft();
    draft.form.categoryId = 3;
    expect(isManualQuizDraftWorthKeeping(draft)).toBe(true);
  });

  it("says yes when a question has been added, whatever the fields say", () => {
    const draft = untouchedManualDraft();
    draft.questions = [
      {
        question: {
          id: -1,
          type: QuestionType.TrueFalse,
          text: "The Danube flows through Vienna",
        } as ManualQuizDraft["questions"][number]["question"],
        settings: {
          pointSystem: "Standard",
          timeLimitInSeconds: 10,
          orderInQuiz: 0,
        },
      },
    ];
    expect(isManualQuizDraftWorthKeeping(draft)).toBe(true);
  });
});

describe("is an AI quiz draft worth keeping", () => {
  it("says no to a wizard sitting on its defaults", () => {
    expect(isAiQuizDraftWorthKeeping(untouchedAiDraft())).toBe(false);
  });

  it("says yes to a typed topic", () => {
    expect(
      isAiQuizDraftWorthKeeping({ ...untouchedAiDraft(), topic: "Photosynthesis" }),
    ).toBe(true);
  });

  it("says yes to a generation, which is the thing that cost something", () => {
    expect(
      isAiQuizDraftWorthKeeping({
        ...untouchedAiDraft(),
        payload: '{"questions":[]}',
      }),
    ).toBe(true);
  });

  it("says yes to a reply pasted but not yet imported", () => {
    expect(
      isAiQuizDraftWorthKeeping({
        ...untouchedAiDraft(),
        pastedReply: "here is your quiz",
      }),
    ).toBe(true);
  });
});

describe("parsing stored drafts", () => {
  it("round-trips a manual draft through JSON", () => {
    const draft = untouchedManualDraft();
    draft.form.title = "Rivers";
    draft.form.categoryId = 2;

    const parsed = parseManualQuizDraft(JSON.parse(JSON.stringify(draft)));

    expect(parsed?.form.title).toBe("Rivers");
    expect(parsed?.form.categoryId).toBe(2);
  });

  it("keeps the parts of a stored question it does not describe", () => {
    // `passthrough()` earns its place here: the builder needs a question's answer options
    // back, and re-describing all six question shapes would be a second copy of types.ts.
    const parsed = parseManualQuizDraft({
      form: {},
      questions: [
        {
          question: {
            id: -1,
            type: QuestionType.MultipleChoice,
            text: "Which of these is a river?",
            answerOptions: [{ text: "Drin", isCorrect: true }],
          },
          settings: {
            pointSystem: "Standard",
            timeLimitInSeconds: 10,
            orderInQuiz: 0,
          },
        },
      ],
    });

    expect(parsed?.questions).toHaveLength(1);
    expect(
      (parsed?.questions[0].question as { answerOptions: unknown[] })
        .answerOptions,
    ).toHaveLength(1);
  });

  it("refuses a manual draft whose questions are the wrong shape", () => {
    expect(
      parseManualQuizDraft({ form: {}, questions: [{ question: "nope" }] }),
    ).toBeNull();
  });

  it("refuses a manual draft whose quiz fields are the wrong type", () => {
    expect(parseManualQuizDraft({ form: { title: 7 }, questions: [] })).toBeNull();
  });

  it("round-trips an AI draft, payload included", () => {
    const draft = { ...untouchedAiDraft(), topic: "Tides", payload: "{}" };
    expect(parseAiQuizDraft(JSON.parse(JSON.stringify(draft)))).toEqual(draft);
  });

  it("refuses an AI draft that is missing a field", () => {
    const withoutPayload: Record<string, unknown> = { ...untouchedAiDraft() };
    delete withoutPayload.payload;
    expect(parseAiQuizDraft(withoutPayload)).toBeNull();
  });

  it("refuses an AI draft naming a question type that does not exist", () => {
    expect(
      parseAiQuizDraft({ ...untouchedAiDraft(), allowedTypes: ["Telepathy"] }),
    ).toBeNull();
  });
});
