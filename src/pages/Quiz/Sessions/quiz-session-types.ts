import { QuestionType } from "@/types/question-types";

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
  options: AnswerOption[];
  timeLimitInSeconds: number;
  timeRemainingInSeconds: number;
  questionType: QuestionType;
  explanation?: string; // Optional explanation for the correct answer
  instantFeedback?: boolean; // Whether to show instant feedback for this question
}

export interface AnswerResult {
  status: AnswerStatus;
  scoreAwarded: number;
  isQuizComplete: boolean;
  correctAnswerId?: number | null; // ID of the correct option for instant feedback
  explanation?: string; // Explanation for the correct answer NOT ADDED IN BACKEND YET
}

export interface QuizState {
  status: LiveQuizStatus;
  activeQuestion: CurrentQuestion | null;
}

export interface UserAnswer {
  id: number;
  sessionId: string;
  quizQuestionId: number;
  selectedOptionId: number | null;
  submittedAnswer: string | null;
  status: AnswerStatus;
  score: number;
  questionText: string;
  selectedOptionText: string | null;
}

export interface QuizSession {
  id: string;
  quizId: number;
  quizTitle: string;
  userId: string;
  startTime: string; // ISO date string
  endTime: string | null; // ISO date string
  totalQuestions:number;
  quizDescription?: string;
  hasInstantFeedback: boolean;
  category: string;
  totalScore: number;
  isCompleted: boolean;
  userAnswers: UserAnswer[];
}