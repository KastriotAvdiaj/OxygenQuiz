import { uniqueSuffix, type QuestionSpec } from "./api";

/**
 * The quiz most tests play: one question of each Classic type, so a single run through it
 * exercises every input component and every grader. Order matters — tests walk it top to bottom
 * (the quiz is created with shuffling off; answer OPTIONS are still shuffled at serve time, which
 * is why the tests pick options by text and never by position — ADR 0006).
 */
export const SAMPLE_QUESTIONS = [
  {
    type: "MultipleChoice",
    text: "Which planet is known as the Red Planet?",
    options: [
      { text: "Mars", isCorrect: true },
      { text: "Venus", isCorrect: false },
      { text: "Jupiter", isCorrect: false },
    ],
  },
  {
    type: "TrueFalse",
    text: "Water boils at 100 degrees Celsius at sea level.",
    answer: true,
  },
  {
    type: "TypeTheAnswer",
    text: "What is the chemical symbol for gold?",
    answer: "Au",
  },
] as const satisfies readonly QuestionSpec[];

/** Unique per test, so a test can find its own quiz in lists shared with every other run. */
export function sampleQuizTitle(): string {
  return `Solar basics ${uniqueSuffix()}`;
}
