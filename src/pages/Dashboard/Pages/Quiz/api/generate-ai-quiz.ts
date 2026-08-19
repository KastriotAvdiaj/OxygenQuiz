import { apiService } from "@/lib/Api-client";
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
  /**
   * The model's JSON object as a string — `questions`, plus the quiz-level `title`,
   * `category` and `language` it chose.
   *
   * Those three are deliberately not lifted into fields of their own. Read them with
   * `extractQuizSuggestions` from `parse-ai-output.ts`, which is also where a *pasted* reply
   * is read — one code path, so the two can't diverge. They used to be separate response
   * fields and copy-paste silently missed out; see docs/quiz/ai-quiz-generation-flow.md §3b.
   */
  payload: string;
  /** Left today after this one. `null` for staff, who have no daily cap. */
  quotaRemaining: number | null;
  inputTokens: number;
  outputTokens: number;
}

export interface AiQuotaStatus {
  /**
   * Whether a generation would be attempted at all — the `Ai:Enabled` kill switch *and* the
   * server's daily/30-day spend caps, which are exactly the conditions behind `FeatureDisabled`.
   *
   * So `false` is not only "the feature is switched off": it also covers "the budget for this
   * period is spent". The distinction doesn't reach the UI on purpose — both mean the same
   * thing to the user, and the copy-paste path is the answer to both.
   */
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

/**
 * Per-request timeouts. The axios instance sets none — a browser XHR with `timeout: 0` waits
 * for a response *forever*, so a server that accepts the connection and then never answers
 * leaves a spinner running with no error, no retry and no way back. That is exactly what the
 * own-AI page did in production: "Preparing…" and nothing else, permanently.
 *
 * They differ because the calls do. Building a prompt is string concatenation on the server;
 * if it hasn't answered in 15s something is wrong. Generation waits on a model, and the server
 * gives it `Ai:TimeoutSeconds` (90) — so the client has to allow more than that, or it gives up
 * on a request that was about to succeed and the user pays a quota slot for nothing. Quota is
 * decoration and should never make anyone wait.
 *
 * A global default on the axios instance would have to be the largest of these, which is the
 * same as not having one for the two fast calls.
 */
const AI_TIMEOUTS_MS = {
  prompt: 15_000,
  generate: 120_000,
  quota: 10_000,
} as const;

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

  // Distinguish "we gave up waiting" from "it never connected": one means try again in a
  // minute, the other means check your connection, and telling someone the wrong one sends
  // them to debug the wrong thing. Axios reports both timeouts and aborts as ECONNABORTED.
  if ((error as AxiosError)?.code === "ECONNABORTED") {
    return new AiGenerateError(
      "Unknown",
      "The server took too long to answer. It may be having a moment — try again shortly.",
    );
  }

  // No structured body: a network failure, a proxy page, or the request never landed.
  return new AiGenerateError(
    "Unknown",
    "Couldn't reach the quiz generator. Check your connection and try again.",
  );
};

/**
 * `apiService`, not the raw `api` instance: only the former unwraps `response.data`. The
 * `api` success interceptor returns the whole `AxiosResponse`, so `api.post(...)` typed as
 * `Promise<T>` compiles and then hands every caller an object whose fields are all
 * `undefined`. See the warning on the `api` export in `src/lib/Api-client.ts`.
 */
export const generateAiQuiz = (data: AiGenerateInput): Promise<AiGenerateResult> =>
  apiService
    .post<AiGenerateResult>("/quiz/ai-generate", data, {
      // The wizard renders its own error panel, which says what to do next per code —
      // retry, wait for the reset, verify your email, use copy-paste. The interceptor's
      // generic "Error" toast on top of that is noise. See docs/development/error-handling.md.
      skipErrorToast: true,
      timeout: AI_TIMEOUTS_MS.generate,
    })
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
  apiService
    .post<{ prompt: string }>("/quiz/ai-prompt", data, {
      // Unlike generation there's no inline panel for this one, so the container raises a
      // toast itself — the interceptor's would be the duplicate.
      skipErrorToast: true,
      timeout: AI_TIMEOUTS_MS.prompt,
    })
    .catch((error) => {
      throw toAiGenerateError(error);
    });

export const getAiQuota = (): Promise<AiQuotaStatus> =>
  apiService.get<AiQuotaStatus>("/quiz/ai-quota", {
    timeout: AI_TIMEOUTS_MS.quota,
  });

/**
 * Drives "3 of 5 left today" and, when `enabled` is false, disables the Generate button
 * rather than offering one that is guaranteed to fail.
 *
 * `retry: false` because the failure that matters here is 401/403 — retrying it three
 * times just delays the fallback UI.
 *
 * <b>`throwOnError: false` is load-bearing.</b> The global default in `lib/React-query.ts`
 * throws every non-401 query error into the nearest error boundary, and this query had not
 * opted out — so a 400 from `/quiz/ai-quota` in production replaced the entire AI page with
 * "Something went wrong". Quota is decoration: every consumer already treats `null` as
 * "unknown" (`QuotaNote` renders nothing, the wizard leaves Generate enabled), so the page is
 * completely usable without it, including the copy-your-own-prompt path — which is precisely
 * the path a user needs when the AI service is having a bad day. See
 * docs/development/error-handling.md, "When to opt out".
 */
export const useAiQuota = () =>
  useQuery({
    queryKey: ["ai-quota"],
    queryFn: getAiQuota,
    retry: false,
    throwOnError: false,
    staleTime: 30_000,
  });
