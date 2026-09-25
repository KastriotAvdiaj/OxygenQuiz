// types/quiz.types.ts

import { PaginatedResponse } from "./common-types";
import { AnyQuestion, CategoryDTO, DifficultyDTO, LanguageDTO } from "./question-types";
import { UserBasic } from "./user-types";

// types/quiz.types.ts

/**
 * A quiz's single access/lifecycle state (see docs/quiz/quiz-visibility.md):
 * - Draft    — only the owner can see/play it.
 * - Unlisted — playable via share link or lobby invite; not in the public catalogue.
 * - Public   — discoverable and playable by everyone.
 */
export type QuizStatus = "Draft" | "Unlisted" | "Public";

/**
 * Which kind of game a quiz is (server counterpart: `QuizFormat`). Fixed at creation.
 * - Classic      — an ordered list of questions, each answered once.
 * - Associations — one Board: 4 columns × 4 tiles, a solution per column and a final solution.
 * See docs/adr/0018-quiz-formats-are-separate-verticals.md and docs/quiz/associations.md.
 */
export type QuizFormat = "Classic" | "Associations";

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
  format: QuizFormat;
  createdAt: string;
  /** Always 0 for an Associations quiz — a board has no questions. Check `format` first. */
  questionCount: number;
  user: string;
  /** Profile image URL of the quiz's creator. Absent if they have no avatar set. */
  userProfileImageUrl?: string;
  /** Soft-delete timestamp. Only populated in admin (includeDeleted) reads; null/absent = live. */
  deletedAt?: string | null;
};

/**
 * A multiplayer host's quiz pick, as it travels over SignalR (server counterpart:
 * SelectedQuizView). Only `id` is authorized server-side in QuizHub.SelectQuiz; the other
 * fields are display labels echoed from the host's picker so guests can render the selection
 * without each re-fetching the quiz.
 *
 * Lives here rather than in the lobby hook because both the transport layer
 * (multiplayer-context) and the lobby UI need it.
 */
export type SelectedQuiz = {
  id: string;
  title: string;
  category?: string | null;
  difficulty?: string | null;
  questionCount?: number | null;
  /**
   * Filled by the server from the quiz, whatever the picker sent — the lobby's rules follow from
   * it: an Associations quiz is a Duel, for exactly 2 players (docs/quiz/multiplayer.md §4.3).
   */
  format?: QuizFormat | null;
};

/** Narrows a full quiz summary down to the fields the lobby broadcasts. */
export const toSelectedQuiz = (quiz: QuizSummaryDTO): SelectedQuiz => ({
  id: quiz.id.toString(),
  title: quiz.title,
  category: quiz.category,
  difficulty: quiz.difficulty,
  questionCount: quiz.questionCount,
  format: quiz.format,
});

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
  format: QuizFormat;
  /** Unlisted share-link token. Only present on the owner's own read. */
  shareToken?: string | null;
  shuffleQuestions: boolean;
  createdAt: string; // DateTime from C# is serialized as a string
  version: number;
  questionCount: number;
  questions: QuizQuestionDTO[]; // List<T> from C# becomes an array T[]
};

export type PaginatedQuizSummaryResponse = PaginatedResponse<QuizSummaryDTO>;