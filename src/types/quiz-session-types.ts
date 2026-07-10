import { QuestionType, QuestionMediaType } from "@/types/question-types";

// Enums from the backend
export enum AnswerStatus {
  NotAnswered = 'NotAnswered',
  Correct = 'Correct',
  Incorrect = 'Incorrect',
  TimedOut = 'TimedOut',
  Pending = 'Pending', // For questions that are yet to be graded/for non-instant feedback quizzes
}

export enum LiveQuizStatus {
  InProgress = 'InProgress',
  BetweenQuestions = 'BetweenQuestions',
  Completed = 'Completed',
}

export enum AbandonmentReason{
  UserInitialized = "UserInitialized",
  TimedOut = "TimedOut",
  SystemCleanup = "SystemCleanup",
}

export interface SessionGradingStatus {
  totalAnswers: number;
  gradedAnswers: number;
  isGradingComplete: boolean;
  percentageComplete:number;
}

// DTOs from the backend
export interface AnswerOption {
  id: number;
  text: string;
}

export interface CurrentQuestion {
  quizQuestionId: number;
  questionText: string;
  // Optional media attachment shown with the question (absolute URL from the API). For legacy
  // image-only questions the backend falls back to the old ImageUrl, with mediaType "Image".
  mediaUrl?: string | null;
  mediaType?: QuestionMediaType;
  options: AnswerOption[];
  timeLimitInSeconds: number;
  timeRemainingInSeconds: number;
  questionType: QuestionType;
  allowMultipleSelections?: boolean; // MC questions that accept more than one correct option
  explanation?: string; // Optional explanation for the correct answer
  instantFeedback?: boolean; // Whether to show instant feedback for this question
}


export interface InstantFeedbackAnswerResult {
  status: AnswerStatus;
  scoreAwarded: number;
  isQuizComplete: boolean;
  correctOptionId?: number;
  correctOptionIds?: number[]; // All correct options for multi-select MC questions
  correctAnswer?: string;
  acceptableAnswers?: string[];
  timeSpentInSeconds: number;
}

export interface QuizState {
  status: LiveQuizStatus;
  activeQuestion: CurrentQuestion | null;
}

export interface UserAnswer {
  id: number;
  status: AnswerStatus;
  score: number;

  // questionExpalanation?: string; // Add in the future

  selectedOptionId: number | null; // For MC/T-F questions
  submittedAnswer: string | null;
  questionText: string;
  mediaUrl?: string | null;
  mediaType?: QuestionMediaType;
  questionType: QuestionType; // matches backend enum
  timeLimitInSeconds: number;
  timeSpentInSeconds: number | null; // Calculated field
  // For MultipleChoice questions
  answerOptions?: AnswerOption[];

  // For TrueFalse questions
  correctAnswerBoolean?: boolean;

  // For TypeTheAnswer questions
  correctAnswerText?: string;
  acceptableAnswers?: string[];

}

export interface QuizSession {
  id: string;
  quizId: number;
  quizTitle: string;
  userId: string;
  startTime: string; // ISO date string
  endTime: string | null; // ISO date string
  totalScore: number;
  isCompleted: boolean;
  userAnswers: UserAnswer[];

  abandonmentReason?: AbandonmentReason;
  abandonedAt?: string | null; // ISO date string

  hasInstantFeedback: boolean;
  totalQuestions: number;
  quizDescription?: string;
  category: string;
}

export interface QuizSessionSummary {
  id: string;
  quizId: number;
  quizTitle: string;
  startTime: string;
  endTime: string | null;
  totalScore: number;
  totalQuestions: number;
  correctAnswers: number;
  isCompleted: boolean;
  duration: string | null;
  abandonmentReason?: AbandonmentReason;
  abandonedAt?: string | null;
}

/**
 * Returned by the resolve-and-resume endpoint after the backend
 * catches up on any timed-out questions.
 */
export interface ResumeResult {
  session: QuizSession;
  activeQuestion: CurrentQuestion | null;
  questionNumber: number;
  isQuizComplete: boolean;
  skippedCount: number;
}