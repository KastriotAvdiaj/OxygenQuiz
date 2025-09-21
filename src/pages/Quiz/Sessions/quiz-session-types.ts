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
  options: AnswerOption[];
  timeLimitInSeconds: number;
  timeRemainingInSeconds: number;
  questionType: QuestionType;
  explanation?: string; // Optional explanation for the correct answer
  instantFeedback?: boolean; // Whether to show instant feedback for this question
}


export interface InstantFeedbackAnswerResult {
  status: AnswerStatus;
  scoreAwarded: number;
  isQuizComplete: boolean;
  correctOptionId?: number;
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