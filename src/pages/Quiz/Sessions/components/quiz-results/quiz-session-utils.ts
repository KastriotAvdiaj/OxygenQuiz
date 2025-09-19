// src/components/quiz/quiz-utils.ts

import { Trophy, Target } from "lucide-react";
import { AnswerStatus, QuizSession } from "../../quiz-session-types";


export interface QuizStats {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  timeoutAnswers: number;
  scorePercentage: number;
  maxPossibleScore: number;
}

export interface PerformanceLevel {
  level: string;
  color: string;
  icon: typeof Trophy | typeof Target;
}

export function calculateQuizStats(session: QuizSession): QuizStats {
  const totalQuestions = session.userAnswers.length;
  const correctAnswers = session.userAnswers.filter(
    (answer) => answer.status === AnswerStatus.Correct
  ).length;
  const incorrectAnswers = session.userAnswers.filter(
    (answer) => answer.status === AnswerStatus.Incorrect
  ).length;
  const timeoutAnswers = session.userAnswers.filter(
    (answer) => answer.status === AnswerStatus.TimedOut
  ).length;

  const scorePercentage =
    totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;
  
  // Calculate max possible score based on actual question scores
  const maxPossibleScore = session.userAnswers.reduce((total, answer) => {
    // Assume each question has the same max score as what they actually got
    // or use a default if score is 0 (for incorrect answers)
    const questionMaxScore = answer.score > 0 ? answer.score : 15; // fallback to 15
    return total + questionMaxScore;
  }, 0);

  return {
    totalQuestions,
    correctAnswers,
    incorrectAnswers,
    timeoutAnswers,
    scorePercentage,
    maxPossibleScore,
  };
}

export function getPerformanceLevel(percentage: number): PerformanceLevel {
  if (percentage >= 90) {
    return { level: "Excellent!", color: "#16a34a", icon: Trophy };
  }
  if (percentage >= 80) {
    return { level: "Great Job!", color: "#16a34a", icon: Target };
  }
  if (percentage >= 70) {
    return { level: "Good Work!", color: "#d97706", icon: Target };
  }
  if (percentage >= 60) {
    return { level: "Keep Practicing!", color: "#d97706", icon: Target };
  }
  return { level: "Try Again!", color: "#dc2626", icon: Target };
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `${remainingSeconds}s`;
}