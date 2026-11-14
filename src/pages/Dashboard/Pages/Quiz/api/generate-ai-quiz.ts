import { apiService } from "@/lib/Api-client";
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
  | "UnsupportedLanguage"
  // Grounding asking the author something (409): a language, an article, or whether to go ahead
  // from memory while the source is down. Not a failure — the wizard shows `SourceChoiceCard`.
  | "SourceNeedsChoice"
  | "ProviderUnavailable"
  | "ProviderTimeout"
  | "ModelOutputInvalid";

export type AiGenerationMode = "Topic" | "Source";

/**
 * What grounding concluded (docs/quiz/ai-quiz-generation-flow.md §2e). `Grounded` and
 * `Ungrounded` arrive with a result; the other three arrive as a 409 `SourceNeedsChoice` —
 * a question for the author, asked before any of their allowance is spent.
 */
export type AiGroundingStatus =
  | "Grounded"
  | "Ungrounded"
  | "NeedsLanguage"
  | "NeedsArticle"
  | "SourceUnavailable";

/** Why a Topic quiz was written from memory. Mirrors the server's `GroundingResult.Reason`. */
export type AiUngroundedReason =
  | "too-thin"
  | "not-found"
  | "unavailable"
  | "declined"
  | "no-source-for-language"
  // A broad topic whose subtopics found too few clear articles (flow doc §2f).
  | "too-few-articles";

/** One article of a broad topic's source — named and linked in the review (its attribution). */
export interface AiGroundedSourcePart {
  provider: string;
  title: string;
  url: string | null;
}

export interface AiGroundedSource {
  /** The source: "wikipedia", "microsoft-learn", or "wikidata" for a fact quiz. */
  provider: string;
  title: string;
  /** Carries the CC BY-SA attribution — the review links to it. */
  url: string | null;
  /** What the model read — the article, then any Wikidata facts. The parser checks every `sourceQuote` against it. */
  text: string;
  language: string;
  /** How many Wikidata facts followed the article. Absent from drafts saved before 2026-11-05. */
  wikidataFacts?: number;
  /**
   * A broad topic ("General knowledge") read from several articles (flow doc §2f): the articles,
   * in the order they appear in `text`. Then `title` is the author's topic, `url` is null, and
   * `text` is all of them in one — so the quote check needs to know nothing about parts. Null or
   * absent for one article.
   */
  parts?: AiGroundedSourcePart[] | null;
}

export interface AiSourceCandidate {
  title: string;
  words: number;
  url: string | null;
  /** Which source: "wikipedia" or "microsoft-learn". Sent back as `sourceProvider`. */
  provider?: string;
  /** What to send back as `sourceTitle`: the title on Wikipedia, the page's URL on Learn. */
  key?: string;
}

export interface AiGrounding {
  status: AiGroundingStatus;
  language?: string | null;
  reason?: AiUngroundedReason | string | null;
  source?: AiGroundedSource | null;
  /** NeedsArticle: the articles to choose between, best match first. */
  articles?: AiSourceCandidate[] | null;
  /** NeedsLanguage: the languages to choose between. */
  languages?: string[] | null;
  /** An outage: which sources couldn't be reached ("wikipedia", "microsoft-learn"). */
  unreachable?: string[] | null;
}

/** The author's answers to grounding's questions, sent back with the same request. */
export interface AiGroundingAnswers {
  sourceLanguage?: string;
  /** The picked article's `key`. */
  sourceTitle?: string;
  /** The picked article's `provider`, so the server fetches it from the right source. */
  sourceProvider?: string;
  /** "None of these" — write from memory. */
  sourceDeclined?: boolean;
  /** The source was down and the author chose not to wait. */
  sourceAcceptFromMemory?: boolean;
}

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
  /** "Add images": the model may give questions an image search phrase (docs/media/media-pipeline.md). */
  addImages?: boolean;
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
  /** What the questions were written from. Null when grounding is switched off. */
  grounding?: AiGrounding | null;
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
   * Daily allowance, or `null` for unlimited (SuperAdmin only; Admin and Teacher get `Ai:DefaultDailyQuota`).
   *
   * Unlimited means the daily *count* is skipped — not spending. The rolling budget caps
   * still apply to everyone, and usage rows are still written, so staff generations show
   * up in the cost ledger like anyone else's.
   */
  limit: number | null;
  used: number;
  remaining: number | null;
  resetsAt: string;
  /**
   * The model that would write the questions, e.g. `deepseek-v4-flash`.
   *
   * `null` whenever `enabled` is false — the server won't name a model it isn't about to call,
   * and the UI says nothing rather than naming one. Treat it as display-only: which vendor we
   * use is a server decision (`Ai:BaseUrl` + `Ai:Model`), and nothing in the client branches on
   * this value.
   */
  model: string | null;
  /**
   * Whether "from my material" is offered: `enabled`, and the configured model is allowed to
   * write from a user's own material (`AllowsSourceMode` on the server's vendor entry). False
   * shows that option as "Coming soon". The server refuses Source-mode generations and uploads
   * on its own — this only stops the UI offering one.
   */
  sourceModeEnabled: boolean;
}

/** `POST /quiz/ai-source`: an uploaded file, read on the server. */
export interface AiSourceResult {
  /**
   * The file's text, whitespace-normalised and cut to `AI_QUESTION_LIMITS.maxSourceChars`.
   * It goes into the material box as-is and is sent back unchanged as `sourceText`, so the
   * model, the quote check and the user all see one string.
   */
  text: string;
  /** The file held more than the limit and only its start was kept. */
  truncated: boolean;
  /** "English" or "Albanian" — what the questions will be written in. */
  language: string;
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
    /** `SourceNeedsChoice`: the question to put to the author. */
    public readonly grounding?: AiGrounding,
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
 * if it hasn't answered in 15s something is wrong. Quota is decoration and should never make
 * anyone wait. Reading an uploaded file is the slow one.
 *
 * Generation is no longer here: it used to be one request held open for the model's whole
 * answer (120s, to outlast the server's 90), and is now a background job whose calls — start,
 * poll, collect — are each as quick as the rest (docs/quiz/ai-quiz-generation-flow.md §3c).
 */
const AI_TIMEOUTS_MS = {
  prompt: 15_000,
  // Starting, polling and collecting a background job: each is a quick read or write.
  job: 15_000,
  quota: 10_000,
  // Upload plus parsing a long PDF on the server. No model call, but a slow uplink matters.
  source: 60_000,
} as const;

interface ServerErrorBody {
  code?: string;
  message?: string;
  retryAfter?: string;
  grounding?: AiGrounding | null;
}

const toAiGenerateError = (error: unknown): AiGenerateError => {
  const body = (error as AxiosError<ServerErrorBody>)?.response?.data;

  if (body?.code) {
    return new AiGenerateError(
      body.code as AiGenerateErrorCode,
      body.message ?? "Quiz generation failed.",
      body.retryAfter,
      body.grounding ?? undefined,
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

// ── Generation as a background job (docs/quiz/ai-quiz-generation-flow.md §3c) ───────────────
//
// `apiService`, not the raw `api` instance, here and below: only the former unwraps
// `response.data`. The `api` success interceptor returns the whole `AxiosResponse`, so
// `api.post(...)` typed as `Promise<T>` compiles and then hands every caller an object whose
// fields are all `undefined`. See the warning on the `api` export in `src/lib/Api-client.ts`.
//
// The wizard no longer holds a request open for the whole generation. It starts a job, polls it
// while its card is on screen, and takes the outcome in the same two shapes `generateAiQuiz`
// resolves and rejects with — so everything after the reply (the parser, the review, the error
// panel, grounding's questions) is unchanged. Leaving the page stops the polling, not the job:
// the server notices nobody is asking, and sends a notification when it is done.

export type AiJobStatus = "Queued" | "Running" | "Succeeded" | "Failed" | "NeedsChoice";

/** A real step the server reports as it starts — not a line paced from a clock. */
export type AiJobStage = "Queued" | "FindingSources" | "Writing" | "Done";

export interface AiJob {
  id: string;
  status: AiJobStatus;
  stage: AiJobStage;
  /** `Succeeded`: what `generateAiQuiz` would have resolved with. */
  result?: AiGenerateResult | null;
  /** `Failed` or `NeedsChoice`: the body `generateAiQuiz` would have been rejected with. */
  error?: ServerErrorBody | null;
  createdAt: string;
}

export const isAiJobFinished = (job: AiJob) => job.status !== "Queued" && job.status !== "Running";

/** A finished job's failure as the error the wizard already knows how to show. */
export const aiJobError = (job: AiJob): AiGenerateError =>
  new AiGenerateError(
    (job.error?.code ?? "Unknown") as AiGenerateErrorCode,
    job.error?.message ?? "Quiz generation failed.",
    job.error?.retryAfter,
    job.error?.grounding ?? undefined,
  );

/**
 * Starts a generation and returns its job straight away. `returnPath` is the page the author is
 * on, which the "your quiz is ready" notification links back to. If they already have one
 * running, the server returns that one and starts nothing — a double press spends once.
 */
export const startAiJob = (
  data: AiGenerateInput & AiGroundingAnswers & { returnPath?: string },
): Promise<AiJob> =>
  apiService
    .post<AiJob>("/quiz/ai-jobs", data, { skipErrorToast: true, timeout: AI_TIMEOUTS_MS.job })
    .catch((error) => {
      throw toAiGenerateError(error);
    });

export const getAiJob = (id: string): Promise<AiJob> =>
  apiService.get<AiJob>(`/quiz/ai-jobs/${id}`, { skipErrorToast: true, timeout: AI_TIMEOUTS_MS.job });

/**
 * The author's newest job still theirs to collect — running, or finished and not yet taken.
 * `null` when there is none (the server answers 204).
 */
export const getActiveAiJob = async (): Promise<AiJob | null> => {
  const job = await apiService.get<AiJob | "" | undefined>("/quiz/ai-jobs/active", {
    skipErrorToast: true,
    timeout: AI_TIMEOUTS_MS.job,
  });
  return job && typeof job === "object" ? job : null;
};

/** The result is in the browser now: don't offer it again, and no notification is owed. */
export const markAiJobSeen = (id: string): Promise<void> =>
  apiService.post<void>(`/quiz/ai-jobs/${id}/seen`, undefined, {
    skipErrorToast: true,
    timeout: AI_TIMEOUTS_MS.job,
  });

/** Asked once when the wizard opens, so a generation left behind is picked back up. */
export const useActiveAiJob = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: ["ai-job", "active"],
    queryFn: getActiveAiJob,
    enabled,
    retry: false,
    throwOnError: false,
    // One answer per visit to the wizard. A refetch on focus would hand back a job the page
    // is already polling.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

/**
 * Reads an uploaded file into text. Creates nothing and spends no generation — the text comes
 * back for the user to look over, then goes out again with `generateAiQuiz`. Failures carry
 * the same codes as generation (`UnreadableSource`, `SourceTooLarge`, `UnsupportedLanguage`),
 * each with a message that names the fix.
 */
export const readAiSource = (file: File): Promise<AiSourceResult> => {
  const body = new FormData();
  body.append("file", file);
  return apiService
    .post<AiSourceResult>("/quiz/ai-source", body, {
      // As the other uploads do (upload-file.ts): axios fills in the boundary.
      headers: { "Content-Type": "multipart/form-data" },
      // Shown beside the upload button instead; the interceptor's toast would be a second copy.
      skipErrorToast: true,
      timeout: AI_TIMEOUTS_MS.source,
    })
    .catch((error) => {
      throw toAiGenerateError(error);
    });
};

/** No invalidation: reading a file changes nothing on the server. */
export const useReadAiSource = () => useMutation({ mutationFn: readAiSource });

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
export const useAiQuota = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: ["ai-quota"],
    queryFn: getAiQuota,
    // `enabled: false` for callers that render where nobody may be signed in — the create-quiz
    // dialog opens from the landing page — since the endpoint answers 401 to a visitor.
    enabled,
    retry: false,
    throwOnError: false,
    staleTime: 30_000,
  });
