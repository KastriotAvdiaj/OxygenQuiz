import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/Api-client";
import { QuestionType } from "@/types/question-types";

/**
 * Screenshot import's two endpoints (docs/quiz/screenshot-import.md). Admin and SuperAdmin only —
 * the API gates them by role; the Questions page only shows the card when `status.enabled`.
 */

/** Mirrors `ScreenshotMakeType` — what the questions should become. */
export type ScreenshotMakeType = "MultipleChoice" | "AsTheyAppear" | "TypeTheAnswer";

/** Mirrors `ScreenshotQuestionDTO`. A proposal: nothing is saved until the reviewer saves it. */
export interface ScreenshotQuestion {
  type: QuestionType;
  seenType: QuestionType;
  text: string;
  /** For true/false, "true" or "false". */
  correctAnswer: string;
  wrongOptions: string[];
  acceptableAnswers: string[];
  explanation: string | null;
  answerFromImage: boolean;
  optionsFromImage: boolean;
  needsItsPicture: boolean;
  imageQuery: string | null;
  categoryId: number | null;
  difficultyId: number | null;
  languageId: number | null;
  duplicateOfId: number | null;
}

export interface ScreenshotReadResult {
  questions: ScreenshotQuestion[];
  /** Null = unlimited (SuperAdmin). */
  imagesLeftToday: number | null;
}

export interface ScreenshotImportStatus {
  enabled: boolean;
  reason: string | null;
  imagesLeftToday: number | null;
  maxImagesPerImport: number;
}

export const screenshotImportStatusQueryOptions = () =>
  queryOptions({
    queryKey: ["screenshot-import", "status"] as const,
    queryFn: async () =>
      (await api.get<ScreenshotImportStatus>("/questions/screenshot-import/status", {
        skipErrorToast: true,
      })).data,
    staleTime: 60_000,
  });

/** Admin pages only: a non-admin gets 403, so the query stays off for them. */
export const useScreenshotImportStatus = (enabled: boolean) =>
  useQuery({ ...screenshotImportStatusQueryOptions(), enabled, retry: false });

/** One image per request, so each has its own status, retry and charge. */
export const readScreenshot = async (
  image: File,
  makeType: ScreenshotMakeType,
  signal?: AbortSignal,
): Promise<ScreenshotReadResult> => {
  const form = new FormData();
  form.append("image", image);
  form.append("makeType", makeType);
  const response = await api.post<ScreenshotReadResult>("/questions/screenshot-import/read", form, {
    headers: { "Content-Type": "multipart/form-data" },
    signal,
    // The image's own row shows the reason; a toast as well would say it twice.
    skipErrorToast: true,
  });
  return response.data;
};
