export type DashboardResource =
  | "questions"
  | "multipleChoiceQuestions"
  | "trueFalseQuestions"
  | "typeTheAnswerQuestions"
  | "quizzes";

export type DashboardFetcherConfig = {
  url: string;
};

const dashboardEndpoints: Record<DashboardResource, DashboardFetcherConfig> = {
  questions: { url: "/dashboard/questions" },
  multipleChoiceQuestions: { url: "/dashboard/questions/multiple-choice" },
  trueFalseQuestions: { url: "/dashboard/questions/true-false" },
  typeTheAnswerQuestions: { url: "/dashboard/questions/type-the-answer" },
  quizzes: { url: "/dashboard/quizzes" },
};

export const getDashboardFetcher = (
  resource: DashboardResource
): DashboardFetcherConfig => {
  const resourceConfig = dashboardEndpoints[resource];

  if (!resourceConfig) {
    throw new Error(`No dashboard endpoint configured for "${resource}"`);
  }

  return resourceConfig;
};

