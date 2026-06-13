// Mirrors QuizAPI.DTOs.Reports.QuizAnalyticsDto (camelCase over the wire).
// Powers the Analytics tab on the individual quiz page.

export type ScoreBucket = {
  label: string;
  count: number;
};

export type AttemptsByDayPoint = {
  date: string; // ISO date
  attempts: number;
  completed: number;
};

export type QuizQuestionAnalyticsRow = {
  questionId: number;
  order: number;
  text: string;
  type: string;
  timesAnswered: number;
  correctCount: number;
  incorrectCount: number;
  correctRate: number; // percent
  averageTimeSeconds: number;
};

export type QuizAnalytics = {
  quizId: number;
  title: string;

  attempts: number;
  completed: number;
  abandoned: number;
  completionRate: number; // percent
  averageScore: number;
  averageDurationSeconds: number;
  highestScore: number;

  scoreDistribution: ScoreBucket[];
  attemptsOverTime: AttemptsByDayPoint[];
  questions: QuizQuestionAnalyticsRow[];
};
