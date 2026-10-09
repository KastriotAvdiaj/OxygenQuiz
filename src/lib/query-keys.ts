import type { FilterQuery } from "@/lib/filtering";
import type { QuestionType } from "@/types/question-types";

// Central query-key factory (TkDodo pattern: https://tkdodo.eu/blog/effective-react-query-keys).
//
// Every question-related query key is built from these factories, so keys can never
// drift apart from the invalidations again. Mutations invalidate the broad roots
// (`questionKeys.all`, `myQuestionKeys.all`, `quizQuestionKeys.all`); TanStack Query's
// prefix matching then covers every list/detail variant nested under them.

/** Admin/search-scoped question queries — everything under ["questions", …]. */
export const questionKeys = {
  all: ["questions"] as const,
  search: (query: FilterQuery) => [...questionKeys.all, "search", query] as const,
  typedSearch: (scope: "all" | "mine", type: QuestionType, query: FilterQuery) =>
    [...questionKeys.all, "typed-search", scope, type, query] as const,
  detail: (questionId: number) =>
    [...questionKeys.all, "detail", questionId] as const,
};

/** Current user's questions (user dashboard + profile total) — ["myQuestions", …]. */
export const myQuestionKeys = {
  all: ["myQuestions"] as const,
  total: () => [...myQuestionKeys.all, "total"] as const,
  list: (
    type: "multipleChoice" | "trueFalse" | "typeTheAnswer",
    params: object = {}
  ) => [...myQuestionKeys.all, type, params] as const,
};

/** Questions as they appear inside a quiz — ["quizQuestions", quizId]. */
export const quizQuestionKeys = {
  all: ["quizQuestions"] as const,
  byQuiz: (quizId: number) => [...quizQuestionKeys.all, quizId] as const,
};

/** Teacher access, Classes and hosted games (docs/quiz/classroom-plan.md) — ["classroom", …]. */
export const classroomKeys = {
  all: ["classroom"] as const,
  myTeacherAccess: () => [...classroomKeys.all, "teacher-access", "mine"] as const,
  teacherRequests: () => [...classroomKeys.all, "teacher-requests"] as const,
  classes: () => [...classroomKeys.all, "classes"] as const,
  hostedGames: () => [...classroomKeys.all, "hosted-games"] as const,
  hostedGame: (id: string) => [...classroomKeys.all, "hosted-games", id] as const,
};

/**
 * Paid plans (docs/auth/paid-plans.md) — ["plans", …]. A plan change (an admin grant today, a
 * purchase later) invalidates `planKeys.all`, which covers the caller's own plan and every admin
 * view of one.
 */
export const planKeys = {
  all: ["plans"] as const,
  catalog: () => [...planKeys.all, "catalog"] as const,
  mine: () => [...planKeys.all, "mine"] as const,
  user: (userId: string) => [...planKeys.all, "user", userId] as const,
};
