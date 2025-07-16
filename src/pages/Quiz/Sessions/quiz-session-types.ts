
// Enums from the backend
export enum AnswerStatus {
  NotAnswered = 'NotAnswered',
  Correct = 'Correct',
  Incorrect = 'Incorrect',
  TimedOut = 'TimedOut',
}

export enum LiveQuizStatus {
  InProgress = 'InProgress',
  BetweenQuestions = 'BetweenQuestions',
  Completed = 'Completed',
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
}

export interface AnswerResult {
  status: AnswerStatus;
  scoreAwarded: number;
  isQuizComplete: boolean;
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
  totalScore: number;
  isCompleted: boolean;
  userAnswers: UserAnswer[];
}