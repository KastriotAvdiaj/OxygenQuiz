import { ROLES } from "@/lib/authorization";
import { QuestionType } from "@/types/question-types";

export type DashboardResource =
  | "questions"
  | "multipleChoiceQuestions"
  | "trueFalseQuestions"
  | "typeTheAnswerQuestions"
  | "quizzes";

export type DashboardFetcherConfig = {
  url: string;
  params?: Record<string, unknown>;
};

type RoleAwareEndpointMap = Record<
  DashboardResource,
  {
    default: DashboardFetcherConfig;
  } & Partial<Record<ROLES, DashboardFetcherConfig>>
>;

const dashboardEndpoints: RoleAwareEndpointMap = {
  questions: {
    default: { url: "/questions/myQuestions" },
    [ROLES.Admin]: { url: "/questions" },
    [ROLES.SuperAdmin]: { url: "/questions" },
  },
  multipleChoiceQuestions: {
    default: {
      url: "/questions/myQuestions",
      params: { type: QuestionType.MultipleChoice },
    },
    [ROLES.Admin]: { url: "/questions/multiplechoice" },
    [ROLES.SuperAdmin]: { url: "/questions/multiplechoice" },
  },
  trueFalseQuestions: {
    default: {
      url: "/questions/myQuestions",
      params: { type: QuestionType.TrueFalse },
    },
    [ROLES.Admin]: { url: "/questions/truefalse" },
    [ROLES.SuperAdmin]: { url: "/questions/truefalse" },
  },
  typeTheAnswerQuestions: {
    default: {
      url: "/questions/myQuestions",
      params: { type: QuestionType.TypeTheAnswer },
    },
    [ROLES.Admin]: { url: "/questions/typeTheAnswer" },
    [ROLES.SuperAdmin]: { url: "/questions/typeTheAnswer" },
  },
  quizzes: {
    default: { url: "/quiz/my" },
    [ROLES.Admin]: { url: "/quiz" },
    [ROLES.SuperAdmin]: { url: "/quiz" },
  },
};

export const getDashboardFetcher = (
  resource: DashboardResource,
  role?: ROLES
): DashboardFetcherConfig => {
  const resourceConfig = dashboardEndpoints[resource];

  if (!resourceConfig) {
    throw new Error(`No dashboard endpoint configured for "${resource}"`);
  }

  if (role && resourceConfig[role]) {
    return resourceConfig[role]!;
  }

  return resourceConfig.default;
};

