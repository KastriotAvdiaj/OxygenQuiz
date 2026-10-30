import { describe, expect, it } from "vitest";
import { QuestionType } from "@/types/question-types";
import type { NewTrueFalseQuestion, QuizQuestion } from "../types";
import {
  peekRemoval,
  popRemoval,
  pushRemoval,
  reinsert,
  type RemovedQuestion,
} from "../question-history";

const q = (id: number): NewTrueFalseQuestion => ({
  id,
  text: `Q${-id}`,
  visibility: "Private",
  difficultyId: 1,
  categoryId: 1,
  languageId: 1,
  type: QuestionType.TrueFalse,
  correctAnswer: true,
});

const settings = { pointSystem: "Standard", timeLimitInSeconds: 10, orderInQuiz: 0 };

/** Remove the question with `id` from `list`, recording it the way the provider does. */
const remove = (list: QuizQuestion[], stack: RemovedQuestion[], id: number) => {
  const index = list.findIndex((x) => x.id === id);
  return {
    list: list.filter((x) => x.id !== id),
    stack: pushRemoval(stack, { question: list[index], settings, index }),
  };
};

const undo = (list: QuizQuestion[], stack: RemovedQuestion[]) => {
  const entry = peekRemoval(stack)!;
  return { list: reinsert(list, entry), stack: popRemoval(stack) };
};

const ids = (list: QuizQuestion[]) => list.map((x) => x.id);

describe("question removal history", () => {
  it("walks several removals back one at a time, newest first, each to where it was", () => {
    let state = { list: [q(-1), q(-2), q(-3), q(-4)] as QuizQuestion[], stack: [] as RemovedQuestion[] };
    state = remove(state.list, state.stack, -2);
    state = remove(state.list, state.stack, -4);
    state = remove(state.list, state.stack, -1);
    expect(ids(state.list)).toEqual([-3]);

    state = undo(state.list, state.stack);
    expect(ids(state.list)).toEqual([-1, -3]);
    state = undo(state.list, state.stack);
    expect(ids(state.list)).toEqual([-1, -3, -4]);
    state = undo(state.list, state.stack);
    expect(ids(state.list)).toEqual([-1, -2, -3, -4]);
    expect(peekRemoval(state.stack)).toBeNull();
  });

  it("clamps to the end when the list has shrunk since", () => {
    const entry: RemovedQuestion = { question: q(-9), settings, index: 5 };
    expect(ids(reinsert([q(-1)], entry))).toEqual([-1, -9]);
  });

  it("leaves a question that is already back where it is", () => {
    const list = [q(-1), q(-2)];
    expect(reinsert(list, { question: q(-2), settings, index: 0 })).toBe(list);
  });
});
