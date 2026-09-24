import type { QuizFormat } from "@/types/quiz-types";

/**
 * Where "Play" goes for a quiz. Each format has its own play screen (ADR 0018): Classic is
 * `/quiz/:id/play`, an Associations board is `/associations/:id/play`. Both take the share-link
 * grant as `?shareToken=` — it is what lets a player start an Unlisted quiz they don't own.
 *
 * One function, so the catalogue, a share link and anything added later can't disagree about it.
 */
export function quizPlayPath(quiz: { id: number; format?: QuizFormat }, shareToken?: string | null): string {
  const path = quiz.format === "Associations" ? `/associations/${quiz.id}/play` : `/quiz/${quiz.id}/play`;
  return shareToken ? `${path}?shareToken=${encodeURIComponent(shareToken)}` : path;
}

/** Where a finished play's results live — the history list and the Classic results page use it. */
export function sessionResultsPath(session: { id: string; format?: QuizFormat }): string {
  return session.format === "Associations" ? `/associations/results/${session.id}` : `/quiz/results/${session.id}`;
}
