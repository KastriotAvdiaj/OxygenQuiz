import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/Api-client";

/**
 * Reports and moderation (docs/media/moderation.md). "Report" here is a viewer's report of a
 * question or quiz — the owner's statistics were renamed Statistics export so the word means one thing.
 */

export const REPORT_REASONS = [
  { value: "WrongAnswer", label: "Wrong answer or information", detailsRequired: true },
  { value: "InappropriateMedia", label: "Inappropriate image or audio", detailsRequired: false },
  { value: "Offensive", label: "Offensive or hateful", detailsRequired: false },
  { value: "Spam", label: "Spam or nonsense", detailsRequired: false },
  { value: "Copyright", label: "Copyright", detailsRequired: false },
  { value: "Other", label: "Other", detailsRequired: true },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const reasonLabel = (reason: string) =>
  REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;

/** Mirrors SubmitReportCM and ContentReportService's checks (the API is the gate). */
export const submitReportSchema = z
  .object({
    questionId: z.number().int().positive().optional(),
    quizId: z.number().int().positive().optional(),
    reason: z.enum(REPORT_REASONS.map((r) => r.value) as [ReportReason, ...ReportReason[]], {
      errorMap: () => ({ message: "Choose a reason." }),
    }),
    details: z.string().trim().max(1000, "Keep it under 1000 characters.").optional(),
  })
  .superRefine((v, ctx) => {
    const reason = REPORT_REASONS.find((r) => r.value === v.reason);
    if (reason?.detailsRequired && !v.details?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["details"],
        message: v.reason === "WrongAnswer" ? "What's the correct answer?" : "Tell us what's wrong.",
      });
    }
  });

export type SubmitReportInput = z.infer<typeof submitReportSchema>;

export const reportKeys = {
  all: ["reports"] as const,
  received: () => [...reportKeys.all, "received"] as const,
  lane: (lane: ReportLane) => [...reportKeys.all, "lane", lane] as const,
  counts: () => [...reportKeys.all, "counts"] as const,
};

export const useSubmitReport = () =>
  useMutation({
    mutationFn: (input: SubmitReportInput) =>
      // The dialog shows the API's reason inline (already reported, own content…).
      api.post("/reports", input, { skipErrorToast: true }).then((r) => r.data),
  });

// ── The queue ──────────────────────────────────────────────────────────────────────────

export type ReportLane = "Urgent" | "NeedsAttention" | "WithAuthor" | "Resolved";

export type ReportEntry = {
  id: string;
  reason: string;
  details?: string | null;
  createdAt: string;
  status: "Open" | "Resolved";
  outcome?: string | null;
  resolutionNote?: string | null;
  resolvedAt?: string | null;
};

export type ReportTarget = {
  lane: ReportLane;
  targetType: "Question" | "Quiz";
  questionId?: number | null;
  quizId?: number | null;
  title: string;
  mediaAssetId?: string | null;
  mediaUrl?: string | null;
  mediaType: "None" | "Image" | "Audio" | "Video";
  mediaHidden: boolean;
  quizHeld: boolean;
  quizPicked: boolean;
  authorId: string;
  author: string;
  openCount: number;
  reasonCounts: Record<string, number>;
  firstReportedAt: string;
  lastReportedAt: string;
  reports: ReportEntry[];
};

export const useReportLane = (lane: ReportLane) =>
  useQuery({
    queryKey: reportKeys.lane(lane),
    queryFn: () => api.get<ReportTarget[]>("/moderation/reports", { params: { lane } }).then((r) => r.data),
  });

export const useReportLaneCounts = () =>
  useQuery({
    queryKey: reportKeys.counts(),
    queryFn: () => api.get<Record<string, number>>("/moderation/reports/counts").then((r) => r.data),
  });

/** Every moderation action, as one mutation: they all change the queue, so they all refresh it. */
export type ModerationAction =
  | { kind: "resolve"; questionId?: number | null; quizId?: number | null; outcome: "Upheld" | "Rejected"; removeMedia?: boolean; holdQuiz?: boolean; note?: string }
  | { kind: "hide-media" | "show-media"; questionId: number }
  | { kind: "hold" | "release" | "pick" | "unpick"; quizId: number }
  | { kind: "remove-media"; assetId: string };

const actionRequest = (a: ModerationAction) => {
  switch (a.kind) {
    case "resolve": {
      const { kind: _kind, ...body } = a;
      return api.post("/moderation/resolve", body);
    }
    case "hide-media":
    case "show-media":
      return api.post(`/moderation/questions/${a.questionId}/${a.kind}`);
    case "hold":
    case "release":
    case "pick":
    case "unpick":
      return api.post(`/moderation/quizzes/${a.quizId}/${a.kind}`);
    case "remove-media":
      return api.post(`/moderation/media/${a.assetId}/remove`);
  }
};

export const useModerationAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: actionRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      // Pick/unpick and holds change what the catalogue and quiz pages show.
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["quiz"] });
    },
  });
};

// ── The author's side ──────────────────────────────────────────────────────────────────

export const useReceivedReports = () =>
  useQuery({
    queryKey: reportKeys.received(),
    queryFn: () => api.get<ReportTarget[]>("/reports/received").then((r) => r.data),
  });

export const useRespondToReports = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { questionId?: number | null; quizId?: number | null; outcome: "Fixed" | "NotAMistake"; note?: string }) =>
      api.post("/reports/respond", body).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
};

/** The URL behind a moderation cover — signed-in only (GET /api/media/hidden/question/{id}). */
export const fetchHiddenMedia = (questionId: number) =>
  api
    .get<{ mediaUrl: string; mediaType: "Image" | "Audio" | "Video" }>(`/media/hidden/question/${questionId}`, {
      skipErrorToast: true,
    })
    .then((r) => r.data);
