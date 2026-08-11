import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";

/**
 * In-app AI generation (docs/quiz/ai-quiz-generation-flow.md §6).
 *
 * This endpoint **creates nothing**. It returns the model's raw JSON for
 * `parse-ai-output.ts` to validate and the builder to review; persistence still goes
 * through the atomic `POST /quiz/ai-import`, unchanged.
 *
 * Entity ids never cross this boundary. We send the *names* that exist in the DB, the
 * server returns names, and the caller resolves them against lists it already has — the
 * same rule difficulties have always followed, which is what makes it impossible for the
 * AI flow to invent a category, language or difficulty.
 */

/** The closed set the server can return. Mirrors `AiErrorCodes` in the API. */
export type AiGenerateErrorCode =
  | "FeatureDisabled"
  | "QuotaExceeded"
  | "EmailNotVerified"
  | "InvalidRequest"
  | "EmptySource"
  | "SourceTooLarge"
  | "UnreadableSource"
  | "ProviderUnavailable"
  | "ProviderTimeout"
  | "ModelOutputInvalid";

export type AiGenerationMode = "Topic" | "Source";

export interface AiGenerateInput {
  mode: AiGenerationMode;
  /** Topic mode: what the quiz is about. */
  topic?: string;
  /** Source mode: the material to build from. */
  sourceText?: string;
  /**
   * Only set when the user explicitly chose a language. Leave undefined and the model
   * picks from `languageNames` — normally matching the language the topic was typed in.
   */
  languageName?: string;
  languageNames: string[];
  /** Send these and the model suggests a category; omit them and the user picks. */
  categoryNames: string[];
  difficultyNames: string[];
  questionCount: number;
  allowedTypes: string[];
  extraInstructions?: string;
}

export interface AiGenerateResult {
  /** `{"questions":[...]}` as a string. Feed it straight to `parseAiOutput`. */
  payload: string;
  /** Suggested title. Free text. */
  suggestedTitle?: string | null;
  /** A name guaranteed to be one we sent, or null. Resolve it against the loaded list. */
  suggestedCategory?: string | null;
  suggestedLanguage?: string | null;
  /** Left today after this one. `null` for staff, who have no daily cap. */
  quotaRemaining: number | null;
  inputTokens: number;
  outputTokens: number;
}

export interface AiQuotaStatus {
  enabled: boolean;
  /**
   * Daily allowance, or `null` for unlimited (Admin / SuperAdmin).
   *
   * Unlimited means the daily *count* is skipped — not spending. The rolling budget caps
   * still apply to everyone, and usage rows are still written, so staff generations show
   * up in the cost ledger like anyone else's.
   */
  limit: number | null;
  used: number;
  remaining: number | null;
  resetsAt: string;
}

/**
 * A generation failure the UI can react to specifically.
 *
 * The server's failures are ordinary outcomes with a machine-readable code, but axios
 * turns any non-2xx into a thrown error and the shared interceptor only keeps the message.
 * So we normalise here rather than making every caller dig through `error.response`.
 */
export class AiGenerateError extends Error {
  constructor(
    public readonly code: AiGenerateErrorCode | "Unknown",
    message: string,
    public readonly retryAfter?: string,
  ) {
    super(message);
    this.name = "AiGenerateError";
  }
}

interface ServerErrorBody {
  code?: string;
  message?: string;
  retryAfter?: string;
}

const toAiGenerateError = (error: unknown): AiGenerateError => {
  const body = (error as AxiosError<ServerErrorBody>)?.response?.data;

  if (body?.code) {
    return new AiGenerateError(
      body.code as AiGenerateErrorCode,
      body.message ?? "Quiz generation failed.",
      body.retryAfter,
    );
  }

  // No structured body: a network failure, a proxy page, or the request never landed.
  return new AiGenerateError(
    "Unknown",
    "Couldn't reach the quiz generator. Check your connection and try again.",
  );
};

/**
 * The two type arguments are both the payload type, not a typo: the shared response
 * interceptor already unwraps `response.data`, so axios's `R` (normally `AxiosResponse<T>`)
 * is really just `T` here. Elsewhere in the codebase that's inferred from the declared
 * return type — but a trailing `.catch` breaks that contextual inference, so it has to be
 * spelled out.
 */
export const generateAiQuiz = (data: AiGenerateInput): Promise<AiGenerateResult> =>
  api
    .post<AiGenerateResult, AiGenerateResult>("/quiz/ai-generate", data)
    .catch((error) => {
      throw toAiGenerateError(error);
    });

type UseGenerateAiQuizOptions = {
  mutationConfig?: MutationConfig<typeof generateAiQuiz>;
};

/**
 * No query invalidation on success: generating creates nothing. The quiz only exists once
 * the user reviews it and the builder posts to `ai-import`, which does its own
 * invalidation. Quota is the one thing that moved, and the result carries the new figure.
 */
export const useGenerateAiQuiz = ({
  mutationConfig,
}: UseGenerateAiQuizOptions = {}) =>
  useMutation({
    mutationFn: generateAiQuiz,
    ...mutationConfig,
  });

/**
 * The prompt the generator *would* send, for the user to paste into their own AI.
 *
 * Free — no quota, no provider call, and it works even when `Ai:Enabled` is false, which
 * is the point: this is the fallback we send people to when generation is unavailable.
 *
 * It comes from the server so there is exactly one prompt in the codebase. It used to be
 * built client-side by `buildPrompt` in `prompt.ts`, which meant a second copy that could
 * drift from the one the generator actually uses (plan §5.1).
 */
export const getAiPrompt = (data: AiGenerateInput): Promise<{ prompt: string }> =>
  api
    .post<{ prompt: string }, { prompt: string }>("/quiz/ai-prompt", data)
    .catch((error) => {
      throw toAiGenerateError(error);
    });

export const getAiQuota = (): Promise<AiQuotaStatus> => api.get("/quiz/ai-quota");

/**
 * Drives "3 of 5 left today" and, when `enabled` is false, hides the Generate button
 * entirely rather than offering one that is guaranteed to fail.
 *
 * `retry: false` because the failure that matters here is 401/403 — retrying it three
 * times just delays the fallback UI.
 */
export const useAiQuota = () =>
  useQuery({
    queryKey: ["ai-quota"],
    queryFn: getAiQuota,
    retry: false,
    staleTime: 30_000,
  });
