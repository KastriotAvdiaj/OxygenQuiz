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
