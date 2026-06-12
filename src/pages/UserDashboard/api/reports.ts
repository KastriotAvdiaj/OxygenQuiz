import { api } from "@/lib/Api-client";

export type ReportType = "quiz-performance" | "question-analytics";
export type ReportExportFormat = "csv" | "excel" | "json";

export interface ReportCriteria {
  from?: string; // yyyy-mm-dd
  to?: string;
}

export interface QuizPerformanceRow {
  quizId: number;
  title: string;
  attempts: number;
  completed: number;
  abandoned: number;
  completionRate: number;
  averageScore: number;
  averageDurationSeconds: number;
}

export interface QuestionAnalyticsRow {
  questionId: number;
  text: string;
  type: string;
  category: string;
  timesUsedInQuizzes: number;
  timesAnswered: number;
  correctCount: number;
  incorrectCount: number;
  correctRate: number;
}

const toParams = (criteria: ReportCriteria): Record<string, string> => {
  const params: Record<string, string> = {};
  if (criteria.from) params.from = criteria.from;
  if (criteria.to) params.to = criteria.to;
  return params;
};

export async function fetchQuizPerformance(criteria: ReportCriteria): Promise<QuizPerformanceRow[]> {
  const response = await api.get("/reports/quiz-performance", { params: toParams(criteria) });
  return response.data as QuizPerformanceRow[];
}

export async function fetchQuestionAnalytics(criteria: ReportCriteria): Promise<QuestionAnalyticsRow[]> {
  const response = await api.get("/reports/question-analytics", { params: toParams(criteria) });
  return response.data as QuestionAnalyticsRow[];
}

/**
 * Downloads a report as a file in the chosen format.
 *
 * The exact rows passed in are POSTed to the server and formatted as-is, so the download always
 * matches what's on screen — including any client-side search/filtering applied to the table.
 * (The server no longer re-queries, which is what previously caused exports to ignore filters.)
 */
export async function exportReport(
  type: ReportType,
  format: ReportExportFormat,
  rows: QuizPerformanceRow[] | QuestionAnalyticsRow[]
): Promise<void> {
  const response = await api.post(`/reports/${type}/export`, rows, {
    params: { format },
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const ext = format === "excel" ? "xlsx" : format;
  const fileName = match ? decodeURIComponent(match[1]) : `${type}.${ext}`;

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
