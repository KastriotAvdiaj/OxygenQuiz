// types/quiz.types.ts

import { PaginatedResponse } from "./common-types";
import { AnyQuestion, CategoryDTO, DifficultyDTO, LanguageDTO } from "./question-types";
import { UserBasic } from "./user-types";

// types/quiz.types.ts


/**
 * A summary of a quiz, typically used for lists.
 */
export type QuizSummaryDTO = {
  id: number;
  title: string;
  description?: string;
  category: string;
  difficulty: string;
  language: string;
  visibility: string;
  isPublished: boolean;
  isActive: boolean;
  createdAt: string; // DateTime from C# is serialized as a string (e.g., ISO 8601)
  questionCount: number;
  user: string;
};

/**
 * Represents a question's configuration within a specific quiz.
 * Named DTO because there's an existing QuizQuestion type for the "new" and existing questions in the questions panel.
 */
export type QuizQuestionDTO = {
  quizId: number;
  questionId: number;
  timeLimitInSeconds: number;
  pointSystem: string;
  orderInQuiz: number;
  question: AnyQuestion;
};

/**
 * The full, detailed representation of a single quiz.
 */
export type Quiz = {
  id: number;
  title: string;
  description?: string;
  user: UserBasic;
  category: CategoryDTO;
  language: LanguageDTO;
  difficulty: DifficultyDTO;
  timeLimitInSeconds: number;
  showFeedbackImmediately: boolean;
  visibility: string;
  shuffleQuestions: boolean;
  isPublished: boolean;
  isActive: boolean;
  createdAt: string; // DateTime from C# is serialized as a string
  version: number;
  questionCount: number;
  questions: QuizQuestionDTO[]; // List<T> from C# becomes an array T[]
};

export type PaginatedQuizSummaryResponse = PaginatedResponse<QuizSummaryDTO>;