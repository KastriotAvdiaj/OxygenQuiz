import { useLocation } from "react-router";
import type { QuizFormat } from "@/types/quiz-types";

/** The two dashboards that host quiz editing. */
export type DashboardBase = "/dashboard" | "/my-dashboard";

/**
 * Where to edit a quiz, by format and by dashboard. Every "Edit" link goes through here, so a
 * board never opens the Classic builder (which would try to save it as a question list — the API
 * refuses that, docs/quiz/associations.md §2) and a new format adds one branch here.
 *
 * - Admin dashboard: `/dashboard/quizzes/edit-quiz/:id` (Classic), `…/:id/board` (Associations).
 * - Player dashboard: `/my-dashboard/quizzes/edit/:id` and `…/:id/board` — where owners edit their
 *   own quizzes. The API is the gate either way: only a quiz's owner can save it.
 */
export function quizEditPath(
  quiz: { id: number; format: QuizFormat },
  base: DashboardBase = "/dashboard"
): string {
  const root =
    base === "/my-dashboard"
      ? `/my-dashboard/quizzes/edit/${quiz.id}`
      : `/dashboard/quizzes/edit-quiz/${quiz.id}`;
  return quiz.format === "Associations" ? `${root}/board` : root;
}

/** The dashboard the current route belongs to — so a shared component links within it. */
export function dashboardBaseOf(pathname: string): DashboardBase {
  return pathname.startsWith("/my-dashboard") ? "/my-dashboard" : "/dashboard";
}

/** `quizEditPath` bound to whichever dashboard the caller is rendered in. */
export function useQuizEditPath() {
  const { pathname } = useLocation();
  const base = dashboardBaseOf(pathname);
  return (quiz: { id: number; format: QuizFormat }) => quizEditPath(quiz, base);
}
