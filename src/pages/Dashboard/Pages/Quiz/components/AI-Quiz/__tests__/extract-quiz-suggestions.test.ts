import { describe, expect, it } from "vitest";

import { extractQuizSuggestions } from "../parse-ai-output";

/**
 * The envelope around the questions: the quiz-level title, category and language the model
 * chose. Read here, in the parser, because this is the one place a *generated* reply and a
 * *pasted* one both pass through.
 *
 * That's the regression this file guards. These three were originally extracted server-side
 * and returned as separate response fields, so a pasted reply carrying all of them was never
 * enriched and the wizard demanded them by hand. See docs/quiz/ai-quiz-generation-flow.md §3b.
 */
describe("extractQuizSuggestions", () => {
  const REPLY = JSON.stringify({
    title: "AI Buzzwords",
    category: "Technology",
    language: "English",
    questions: [{ type: "TrueFalse", text: "a", correctAnswer: true }],
  });

  it("reads the quiz-level fields from a bare reply", () => {
    expect(extractQuizSuggestions(REPLY)).toEqual({
      title: "AI Buzzwords",
      category: "Technology",
      language: "English",
      hasQuestions: true,
    });
  });

  it("reads them from a reply wrapped in prose and code fences", () => {
    // What a chat UI actually hands you when you copy the whole answer — the case the
    // copy-paste path exists for.
    const raw = `Sure! Here's your quiz:\n\n\`\`\`json\n${REPLY}\n\`\`\`\n\nLet me know!`;

    expect(extractQuizSuggestions(raw)).toMatchObject({
      category: "Technology",
      language: "English",
      hasQuestions: true,
    });
  });

  it("returns nulls rather than throwing when the model omitted them", () => {
    // Still a perfectly good set of questions; the user just picks the category themselves.
    const raw = JSON.stringify({ questions: [{ text: "a" }] });

    expect(extractQuizSuggestions(raw)).toEqual({
      title: null,
      category: null,
      language: null,
      hasQuestions: true,
    });
  });

  it.each([
    ["json null", JSON.stringify({ category: null, questions: [{ text: "a" }] })],
    ["blank", JSON.stringify({ category: "   ", questions: [{ text: "a" }] })],
    ["wrong type", JSON.stringify({ category: 7, questions: [{ text: "a" }] })],
    ["an array", JSON.stringify({ category: ["History"], questions: [{ text: "a" }] })],
  ])("treats a %s category as absent", (_label, raw) => {
    expect(extractQuizSuggestions(raw).category).toBeNull();
  });

  it("flags a reply with no questions, so the caller can report a bad paste", () => {
    // Without this the wizard would ask the user to pick a category for something that isn't
    // a quiz, instead of telling them the paste was unusable.
    expect(extractQuizSuggestions("I'd be happy to help!").hasQuestions).toBe(false);
    expect(extractQuizSuggestions(JSON.stringify({ questions: [] })).hasQuestions).toBe(
      false,
    );
  });

  it("survives input that isn't JSON at all", () => {
    expect(extractQuizSuggestions("")).toEqual({
      title: null,
      category: null,
      language: null,
      hasQuestions: false,
    });
  });
});
