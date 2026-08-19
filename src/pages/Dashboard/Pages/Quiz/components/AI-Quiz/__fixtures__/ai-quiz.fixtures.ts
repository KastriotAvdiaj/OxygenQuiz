import { QuestionType } from "@/types/question-types";
import type {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";

import { parseAiOutput, type ParseResult } from "../parse-ai-output";

/**
 * Fixtures shared by the two AI-path story files (`ai-quiz-wizard-view.stories.tsx` and
 * `own-ai-quiz-view.stories.tsx`).
 *
 * Both paths render the same lookups, the same parser and the same failure modes, so a
 * second copy of these would be two sets of "the reply that isn't JSON" that quietly stop
 * matching. Replies specific to one path stay in that path's story file.
 *
 * Typed against the real lookup types, so a field added to them breaks these files rather
 * than silently rendering a half-populated dropdown.
 */
export const categories: QuestionCategory[] = [
  { id: 1, name: "Science", createdAt: "", colorPaletteJson: "", gradient: false, username: "admin" },
  { id: 2, name: "History", createdAt: "", colorPaletteJson: "", gradient: false, username: "admin" },
  { id: 3, name: "Geography", createdAt: "", colorPaletteJson: "", gradient: false, username: "admin" },
];

export const difficulties: QuestionDifficulty[] = [
  { id: 1, level: "Easy", weight: 1, createdAt: "", username: "admin" },
  { id: 2, level: "Medium", weight: 2, createdAt: "", username: "admin" },
  { id: 3, level: "Hard", weight: 3, createdAt: "", username: "admin" },
];

export const languages: QuestionLanguage[] = [
  { id: 1, language: "English", createdAt: "", username: "admin" },
  { id: 2, language: "Albanian", createdAt: "", username: "admin" },
];

export const SOURCE_MATERIAL = `The water cycle describes the continuous movement of water on, above and below the
surface of the Earth. Water evaporates from oceans and lakes, condenses into clouds,
falls as precipitation, and returns to the sea through rivers and groundwater.`;

/** Same parse context the container derives from the suggestions plus any user overrides. */
export const parseContext = {
  categoryId: 1,
  languageId: 1,
  quizDifficultyId: 2,
  difficulties,
};

/**
 * The **real parser** on a fixture reply. Stories call this rather than hand-writing a
 * `ParseResult`: a hand-written one keeps rendering happily after a parser regression, while
 * this way a change in what the parser drops, clamps or falls back on shows up visually.
 */
export const parse = (rawReply: string): ParseResult =>
  parseAiOutput(rawReply, parseContext);

// ── Replies that fail, and how ─────────────────────────────────────────────────────────

/** The model answered conversationally instead of emitting JSON. */
export const NO_JSON_REPLY =
  "I'd be happy to help you build a quiz! Could you tell me a bit more about the " +
  "audience and how difficult you'd like the questions to be?";

/** Valid JSON, wrong schema — usually someone's own prompt rather than ours. */
export const WRONG_SHAPE_REPLY = JSON.stringify({
  quiz: { title: "The Water Cycle", items: [{ q: "What is evaporation?" }] },
});

/** Right shape, but not one question survives validation: the batch is rejected whole. */
export const ALL_INVALID_REPLY = JSON.stringify({
  questions: [
    { type: QuestionType.MultipleChoice, text: "No options at all", difficulty: "Easy" },
    { type: QuestionType.TrueFalse, text: "Not a boolean", difficulty: "Easy", correctAnswer: "maybe" },
    { type: QuestionType.TypeTheAnswer, text: "Empty answer", difficulty: "Easy", correctAnswer: "  " },
  ],
});
