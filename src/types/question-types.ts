import { UserBasic } from "./user-types";
import { PaginatedResponse } from "./common-types";

export type CategoryDTO = {
  id: number;
  name: string;
  emoji: string;
};

export type DifficultyDTO = {
  id: number;
  level: string;
  weight: number;
  /** Admin-only — see the note on `QuestionCategory.username`. */
  username?: string;
  createdAt:string;
};

export type LanguageDTO = {
  id: number;
  language: string;
  /** Admin-only — see the note on `QuestionCategory.username`. */
  username?: string;
  createdAt:string;
};

export type AnswerOption = {
  id: number;
  text: string;
  isCorrect: boolean;
};

export enum QuestionType {
  MultipleChoice = "MultipleChoice",
  TrueFalse = "TrueFalse",
  TypeTheAnswer = "TypeTheAnswer",
}

/**
 * Kind of media attached to a question. Mirrors the backend `QuestionMediaType` enum
 * (serialized as these strings). A question carries at most one attachment.
 */
export type QuestionMediaType = "None" | "Image" | "Audio" | "Video";

export type QuestionCategory = {
  id: number;
  createdAt: string;
  colorPaletteJson: string;
  gradient: boolean;
  name: string;
  /**
   * Who created the row. **Only present on the admin search response**
   * (`GET /api/questioncategories/search`, role-gated) — the public list, the single-category
   * read and the categories embedded in question and quiz payloads all omit it, because who
   * created a lookup row is admin metadata and those responses are readable anonymously.
   *
   * Optional for that reason: if you are rendering this outside the dashboard's category
   * table, it is undefined and that is correct, not a bug to work around.
   */
  username?: string;
};

export type QuestionDifficulty = {
  id: number;
  level: string;
  /** Admin-only — see the note on `QuestionCategory.username`. */
  username?: string;
  weight: number;
  createdAt: string;
};

export type QuestionLanguage = {
  id: number;
  language: string;
  /** Admin-only — see the note on `QuestionCategory.username`. */
  username?: string;
  createdAt: string;
};

export interface QuestionBase {
  id: number;
  text: string;
  visibility: string;
  difficulty: DifficultyDTO;
  category: CategoryDTO;
  language: LanguageDTO;
  imageUrl: string;
  createdAt: string;
  user: UserBasic;
  type: QuestionType;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: QuestionType.MultipleChoice;
  answerOptions: AnswerOption[];
  allowMultipleSelections: boolean;
}

export interface TrueFalseQuestion extends QuestionBase {
  type: QuestionType.TrueFalse;
  correctAnswer: boolean;
}

export interface TypeTheAnswerQuestion extends QuestionBase {
  type: QuestionType.TypeTheAnswer;
  correctAnswer: string;
  isCaseSensitive: boolean;
  allowPartialMatch: boolean;
  acceptableAnswers: string[];
}

export type AnyQuestion =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | TypeTheAnswerQuestion;

export type IndividualQuestion = {
  id: number;
  text: string;
  createdAt: string;
  userId: string;
  user: UserBasic;
  difficulty: string;
  language: string;
  languageId: number;
  difficultyId: number;
  category: string;
  visibility: string;
  categoryId: number;
  answerOptions: AnswerOption[];
};

export type PaginatedQuestionResponse = PaginatedResponse<QuestionBase>;
export type PaginatedMultipleChoiceQuestionResponse = PaginatedResponse<MultipleChoiceQuestion>;
export type PaginatedTrueFalseQuestionResponse = PaginatedResponse<TrueFalseQuestion>;
export type PaginatedTypeTheAnswerQuestionResponse = PaginatedResponse<TypeTheAnswerQuestion>;