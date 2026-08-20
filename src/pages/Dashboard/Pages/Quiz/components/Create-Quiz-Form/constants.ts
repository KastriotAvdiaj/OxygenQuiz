import { QuestionType } from "@/types/question-types";
import { NewMultipleChoiceQuestion, NewTrueFalseQuestion, NewTypeTheAnswerQuestion } from "./types";

/**
 * IDs of the seeded "Unspecified" lookups (see OxygenBackend DbSeeder). New questions start
 * here as a safe default. At save time, category and language are overwritten with the quiz's
 * values (see inherit-quiz-classification.ts); only difficulty is intended to stay Unspecified.
 */
export const UnspecifiedIds = {
    categoryId:    1,
    difficultyId:  1,
    languageId:    1,
  } as const;

  export const POINT_SYSTEM_OPTIONS = [
  { value: "Standard", label: "Standard " },
  { value: "Double", label: "Double" },
  { value: "Quadruple", label: "Quadruple" },
  // { value: "Custom", label: "Custom" }, Should add in the future
] as const;

/**
 * The per-question time limits a quiz may use.
 *
 * <b>This list is the vocabulary, not a suggestion.</b> `AiPromptBuilder.cs` sends these exact
 * numbers to the model as an enum (the same way it sends category, language, difficulty and
 * point-system names), and `parse-ai-output.ts` snaps anything else to the nearest entry. The
 * prompt used to ask for "an integer between 5 and 300", which meant a perfectly obedient
 * model could answer 22 — a legal value that no `SelectItem` matched, so the dropdown in
 * `quiz-question-settings.tsx` rendered blank while quietly holding 22.
 *
 * <b>Nine values, not six.</b> The prompt asks the model to scale time with difficulty, and it
 * can only do that if the steps are close enough to mean something: 15 → 30 → 60 is a doubling
 * each time, so "slightly harder" had nowhere to land. 20, 45 and 90 fill the gaps.
 *
 * Keep in step with `AiPromptBuilder.AllowedTimeLimits`. They are separated by a process
 * boundary, so there is no compiler to enforce it — the snap in `parse-ai-output.ts` is what
 * makes drift harmless rather than a blank dropdown.
 */
export const TIME_LIMIT_OPTIONS = [
  { value: 5, label: "5 seconds" },
  { value: 10, label: "10 seconds" },
  { value: 15, label: "15 seconds" },
  { value: 20, label: "20 seconds" },
  { value: 30, label: "30 seconds" },
  { value: 45, label: "45 seconds" },
  { value: 60, label: "1 minute" },
  { value: 90, label: "1 minute 30 seconds" },
  { value: 120, label: "2 minutes" },
] as const;

/** Just the numbers, for matching and snapping. */
export const TIME_LIMIT_VALUES: readonly number[] = TIME_LIMIT_OPTIONS.map(
  (option) => option.value,
);

/**
 * The nearest allowed time limit to `seconds`. Ties go to the shorter option — a question the
 * model thought was worth 22 seconds is better served by 20 than by 30, since the author can
 * always add time and rarely notices when there is too much.
 */
export const snapToTimeLimit = (seconds: number): number =>
  TIME_LIMIT_VALUES.reduce((best, candidate) =>
    Math.abs(candidate - seconds) < Math.abs(best - seconds) ? candidate : best,
  );

export const DEFAULT_NEW_MULTIPLE_CHOICE: NewMultipleChoiceQuestion = {
  id: -1,
  text: "",
  visibility: "Private",
  difficultyId: UnspecifiedIds.difficultyId,
  categoryId: UnspecifiedIds.categoryId,
  languageId: UnspecifiedIds.languageId,
  imageUrl: "",
  type: QuestionType.MultipleChoice,
  answerOptions: [
    { id: -1, text: "", isCorrect: false },
    { id: -2, text: "", isCorrect: false },
    { id: -3, text: "", isCorrect: false },
    { id: -4, text: "", isCorrect: false },
  ],
  allowMultipleSelections: false,
};

export const DEFAULT_NEW_TRUE_FALSE: NewTrueFalseQuestion = {
  id: -2,
  text: "",
  visibility: "Private",
difficultyId: UnspecifiedIds.difficultyId,
  categoryId: UnspecifiedIds.categoryId,
  languageId: UnspecifiedIds.languageId,
  imageUrl: "",
  type: QuestionType.TrueFalse,
  correctAnswer: true,
};

export const DEFAULT_NEW_TYPE_ANSWER: NewTypeTheAnswerQuestion = {
  id: -3,
  text: "",
  visibility: "Private",
  difficultyId: UnspecifiedIds.difficultyId,
  categoryId: UnspecifiedIds.categoryId,
  languageId: UnspecifiedIds.languageId,
  imageUrl: "",
  type: QuestionType.TypeTheAnswer,
  correctAnswer: "",
  isCaseSensitive: false,
  allowPartialMatch: false,
  acceptableAnswers: [],
};