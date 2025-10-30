import { UserBasic } from "./user-types";
import { DashboardPaginatedResponse } from "./common-types";

export type CategoryDTO = {
  id: number;
  name: string;
  emoji: string;
};

export type DifficultyDTO = {
  id: number;
  level: string;
  weight: number;
  username: string;
  createdAt:string;
};

export type LanguageDTO = {
  id: number;
  language: string;
  username: string;
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

export type QuestionCategory = {
  id: number;
  createdAt: string;
  colorPaletteJson :string;
  gradient: boolean;
  username: string;
  name: string;
};

export type QuestionDifficulty = {
  id: number;
  level: string;
  username: string;
  weight: number;
  createdAt: string;
};

export type QuestionLanguage = {
  id: number;
  language: string;
  username: string;
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

export type PaginatedQuestionResponse = DashboardPaginatedResponse<QuestionBase>;
export type PaginatedMultipleChoiceQuestionResponse = DashboardPaginatedResponse<MultipleChoiceQuestion>;
export type PaginatedTrueFalseQuestionResponse = DashboardPaginatedResponse<TrueFalseQuestion>;
export type PaginatedTypeTheAnswerQuestionResponse = DashboardPaginatedResponse<TypeTheAnswerQuestion>;