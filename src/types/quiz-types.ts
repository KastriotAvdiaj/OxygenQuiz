// types/quiz.types.ts

import { PaginatedResponse } from "./common-types";
import { AnyQuestion, CategoryDTO, DifficultyDTO, LanguageDTO } from "./question-types";
import { UserBasic } from "./user-types";

// types/quiz.types.ts

/**
 * A quiz's single access/lifecycle state (see docs/quiz-visibility.md):
 * - Draft    — only the owner can see/play it.
 * - Unlisted — playable via share link or lobby invite; not in the public catalogue.
 * - Public   — discoverable and playable by everyone.
 */
export type QuizStatus = "Draft" | "Unlisted" | "Public";

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
  imageUrl?: string; 
  colorPaletteJson?:string;
  gradient:boolean;
  timeLimitInSeconds:number;
  status: QuizStatus;
  createdAt: string;
  questionCount: number;
  user: string;
  /** Soft-delete timestamp. Only populated in admin (includeDeleted) reads; null/absent = live. */
  deletedAt?: string | null;
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
  imageUrl?: string; 
  user: UserBasic;
  category: CategoryDTO;
  language: LanguageDTO;
  difficulty: DifficultyDTO;
  timeLimitInSeconds: number;
  showFeedbackImmediately: boolean;
  status: QuizStatus;
  /** Unlisted share-link token. Only present on the owner's own read. */
  shareToken?: string | null;
  shuffleQuestions: boolean;
  createdAt: string; // DateTime from C# is serialized as a string
  version: number;
  questionCount: number;
  questions: QuizQuestionDTO[]; // List<T> from C# becomes an array T[]
};

export type PaginatedQuizSummaryResponse = PaginatedResponse<QuizSummaryDTO>;