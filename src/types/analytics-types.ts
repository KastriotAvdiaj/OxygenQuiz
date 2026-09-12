// Mirrors QuizAPI.DTOs.Reports.QuizAnalyticsDto (camelCase over the wire).
// Powers the Analytics tab on the individual quiz page.

export type ScoreBucket = {
  label: string;
  count: number;
};

export type AttemptsByDayPoint = {
  /**
   * Midnight on this bucket's day **in the viewer's time zone**, serialized without an offset
   * (`2026-09-11T00:00:00`). The missing `Z` matters: JavaScript reads an offset-less date-time
   * as local, which is what makes `new Date(point.date)` land on the day the server counted.
   * Never re-format this with `timeZone: "UTC"`.
   */
  date: string;
  attempts: number;
  /** Genuine completions only — sessions the abandonment sweep flagged are excluded. */
  completed: number;
};

export type QuizQuestionAnalyticsRow = {
  questionId: number;
  order: number;
  text: string;
  type: string;
  /** Every submission recorded against this question, graded or not. */
  timesAnswered: number;
  /**
   * Submissions with a settled outcome (Correct / Incorrect / TimedOut) — the denominator of
   * `correctRate`. Below `timesAnswered` when answers are still awaiting background grading,
   * which is why the rate is gated on this and not on `timesAnswered`.
   */
  gradedCount: number;
  /** `timesAnswered - gradedCount`. Non-zero means the rate covers only part of the answers. */
  ungradedCount: number;
  correctCount: number;
  incorrectCount: number;
  /** Correct as a percentage of `gradedCount`. */
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
  /**
   * What a flawless, instant run of the quiz's current questions would score. The denominator
   * that makes `averageScore` and `highestScore` readable. Zero when the quiz has no questions.
   */
  maxPossibleScore: number;

  scoreDistribution: ScoreBucket[];
  attemptsOverTime: AttemptsByDayPoint[];
  questions: QuizQuestionAnalyticsRow[];
};
