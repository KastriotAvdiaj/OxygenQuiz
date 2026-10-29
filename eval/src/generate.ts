/**
 * Stage 1 — run every topic through the real prompt and the real model, and save the raw replies.
 *
 * **This file does not contain a prompt, and must never grow one.** The prompt is built by
 * `AiPromptBuilder.cs` and fetched over `POST /api/quiz/ai-prompt`, which exists precisely so
 * that a second caller cannot drift from the first (docs/quiz/ai-quiz-two-paths.md §3). An
 * eval harness with its own copy of the prompt measures the copy, which is worse than measuring
 * nothing because the number looks real. The assertion in `fetchPrompt` is there to make a
 * future shortcut fail loudly.
 *
 * What it *does* bypass is `ai-generate`: the orchestration around the model call — quota
 * reservation, the usage ledger, the audit write, the HTTP error mapping. None of that affects
 * the questions that come back, and going around it means a 12-topic run costs no quota slots
 * and leaves no rows behind. The two things that matter — the prompt and the model — are the
 * production ones.
 *
 * Usage:  npx vite-node eval/src/generate.ts -- [--language-mode=inferred|pinned] [--run-id=NAME]
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  API_URL,
  API_USER,
  INSECURE_TLS,
  REPO_ROOT,
  RUNS_ROOT,
  SAMPLING,
  THROTTLE_MS,
  TPM_LIMIT,
  TOPICS_FILE,
  VENDOR,
  requireEnv,
} from "./config";

if (INSECURE_TLS) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/**
 * Whether the model is told which language to write in.
 *
 * `inferred` is what production does today: there is no language picker on the generate form,
 * so `LanguageName` is never sent and the model guesses the language from the topic string
 * (`AiPromptBuilder.cs`, the `askForLanguage` branch). `pinned` sends it. Running both is how
 * you find out what the missing picker costs, which is a number nobody currently has.
 */
type LanguageMode = "inferred" | "pinned";

interface TopicRow {
  id: string;
  topic: string;
  language: string;
  note?: string;
  questionCount?: number;
  allowedTypes?: string[];
  difficultyNames?: string[];
  categoryNames?: string[];
  languageNames?: string[];
  /**
   * `--grounding` only: the article an author would pick if the server asks "which article?".
   * Must match a candidate's title exactly. Absent, or not among the candidates, the run takes
   * the first candidate and the report marks that topic as auto-answered.
   */
  sourceTitle?: string;
  /**
   * `--grounding` only: answer "which article?" with "none of these" — for topics Wikipedia has no
   * good article for, where an author would decline rather than pick a wrong one.
   */
  noSource?: boolean;
}

/** What `--grounding` was told by the server, per topic. Written to raw/ and read by parse. */
interface GroundingInfo {
  status: "Grounded" | "Ungrounded" | "NeedsLanguage" | "NeedsArticle" | "SourceUnavailable";
  language?: string | null;
  reason?: string | null;
  source?: { provider: string; title: string; url?: string | null; text: string; language: string } | null;
  articles?: { title: string; words: number }[] | null;
  languages?: string[] | null;
}

/** One question the server put to the "author", and how the run answered it. */
interface Ask {
  kind: "language" | "article" | "unavailable";
  offered: string[];
  answered: string;
  /** True when topics.json didn't say what to pick and the run took the first offer. */
  auto: boolean;
}

interface TopicsFile {
  defaults: Required<
    Pick<
      TopicRow,
      "questionCount" | "allowedTypes" | "difficultyNames" | "categoryNames" | "languageNames"
    >
  >;
  topics: TopicRow[];
}

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

/**
 * Is the API up, before anything else is attempted?
 *
 * Worth its own step because every other failure reads the same from the outside. A run that
 * dies on its first call with a bare network error is indistinguishable from a bad password, a
 * wrong port, or a server that stopped — and the first version of this harness reported all of
 * them as the word "failed".
 */
async function preflight(): Promise<void> {
  try {
    await fetch(`${API_URL}/quiz/ai-quota`, { method: "GET" });
  } catch (err) {
    throw new Error(
      `Cannot reach the API at ${API_URL}\n` +
        `  ${describeError(err)}\n\n` +
        `  Is it running? The harness needs it for POST /quiz/ai-prompt — that is the only\n` +
        `  thing it asks the server for, and without it there is no prompt to send.\n` +
        `    - start it:        dotnet run --project OxygenBackend/QuizAPI\n` +
        `    - check the port:  EVAL_API_URL is ${API_URL}; compare with what dotnet run prints\n` +
        `    - self-signed TLS: set EVAL_INSECURE_TLS=1 in eval/.env`,
    );
  }
}

async function login(): Promise<string> {
  const res = await fetchWithRetry(
    `${API_URL}/Authentication/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: API_USER.email, password: API_USER.password }),
    },
    "login",
  );
  if (!res.ok) {
    throw new Error(
      `Login failed (${res.status}) for ${API_USER.email}. ` +
        `Check EVAL_API_EMAIL / EVAL_API_PASSWORD against an account in the database this API is using.`,
    );
  }
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error("Login succeeded but returned no token.");
  return body.token;
}

/**
 * Unwrap what `fetch` actually failed on.
 *
 * Node's fetch throws a bare `TypeError: fetch failed` and hides the real reason — ECONNRESET,
 * ENOTFOUND, a TLS error, a socket hang-up — one level down in `cause`. Reporting the outer
 * message tells you nothing, which is exactly what the first run of this harness did across six
 * topics. Always print the chain.
 */
function describeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const parts: string[] = [err.message];
  let cause: unknown = (err as { cause?: unknown }).cause;
  while (cause instanceof Error) {
    const code = (cause as { code?: string }).code;
    parts.push(code ? `${cause.message} (${code})` : cause.message);
    cause = (cause as { cause?: unknown }).cause;
  }
  return parts.join(" ← ");
}

/**
 * A transient network failure should cost a retry, not a topic.
 *
 * Deliberately not a retry on HTTP status: a 4xx from either endpoint is a real answer the caller
 * needs to see and act on. This covers only the case where no response arrived at all.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
  attempts = 3,
): Promise<Response> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      last = err;
      if (i < attempts) {
        const wait = 4000 * i;
        console.warn(`      ${label} attempt ${i}/${attempts} failed: ${describeError(err)} — retrying in ${wait / 1000}s`);
        await sleep(wait);
      }
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${describeError(last)}`);
}

/** The request body both `ai-prompt` and `ai-generate` take (`AiGenerateCM`). */
function buildRequest(
  topic: TopicRow,
  defaults: TopicsFile["defaults"],
  mode: LanguageMode,
  grounding: boolean,
) {
  return {
    Mode: "Topic",
    // Off reproduces the baseline's prompt exactly; on grounds it as generation would
    // (docs/quiz/ai-quiz-generation-flow.md §2e). The server must also have Ai:Source:Enabled.
    Ground: grounding,
    Topic: topic.topic,
    // Omitted in `inferred` mode so the server takes the same branch the app takes today.
    LanguageName: mode === "pinned" ? topic.language : undefined,
    LanguageNames: topic.languageNames ?? defaults.languageNames,
    CategoryNames: topic.categoryNames ?? defaults.categoryNames,
    DifficultyNames: topic.difficultyNames ?? defaults.difficultyNames,
    QuestionCount: topic.questionCount ?? defaults.questionCount,
    AllowedTypes: topic.allowedTypes ?? defaults.allowedTypes,
  };
}

/**
 * The prompt for one topic, answering grounding's questions the way an author would: the topic's
 * own language for "English or Albanian?", and `sourceTitle` (else the first offer) for "which
 * article?". At most one of each, so a server that keeps asking fails the topic instead of looping.
 */
async function promptFor(
  token: string,
  topic: TopicRow,
  request: Record<string, unknown>,
): Promise<{ prompt: string; grounding: GroundingInfo | null; asks: Ask[]; request: Record<string, unknown> }> {
  const asks: Ask[] = [];
  let body = { ...request };
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await fetchPrompt(token, body);
    if ("prompt" in result) return { ...result, asks, request: body };

    const question = result.needsChoice;
    if (question.status === "NeedsLanguage" && !asks.some((a) => a.kind === "language")) {
      asks.push({ kind: "language", offered: question.languages ?? [], answered: topic.language, auto: false });
      body = { ...body, SourceLanguage: topic.language };
    } else if (question.status === "NeedsArticle" && !asks.some((a) => a.kind === "article") && topic.noSource) {
      const offered = (question.articles ?? []).map((a) => a.title);
      asks.push({ kind: "article", offered, answered: "none of these", auto: false });
      body = { ...body, SourceDeclined: true, SourceLanguage: question.language ?? topic.language };
    } else if (question.status === "NeedsArticle" && !asks.some((a) => a.kind === "article")) {
      const offered = (question.articles ?? []).map((a) => a.title);
      const wanted = topic.sourceTitle && offered.includes(topic.sourceTitle) ? topic.sourceTitle : undefined;
      const answered = wanted ?? offered[0];
      if (!answered) throw new Error("The server asked which article but offered none.");
      asks.push({ kind: "article", offered, answered, auto: wanted === undefined });
      body = { ...body, SourceTitle: answered, SourceLanguage: question.language ?? topic.language };
    } else if (question.status === "SourceUnavailable" && !asks.some((a) => a.kind === "unavailable")) {
      // Wikipedia was down. An author could wait; a measurement shouldn't silently become a
      // from-memory run, so the report marks the topic (asked: unavailable) and it can be re-run.
      asks.push({ kind: "unavailable", offered: ["try again", "write from memory"], answered: "write from memory", auto: true });
      body = { ...body, SourceAcceptFromMemory: true, SourceLanguage: question.language ?? topic.language };
    } else {
      throw new Error(`The server asked again after being answered: ${JSON.stringify(question)}`);
    }
  }
  throw new Error("Grounding kept asking.");
}

async function fetchPrompt(
  token: string,
  body: unknown,
): Promise<{ prompt: string; grounding: GroundingInfo | null } | { needsChoice: GroundingInfo }> {
  const res = await fetchWithRetry(`${API_URL}/quiz/ai-prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }, "ai-prompt");
  if (res.status === 409) {
    const err = (await res.json()) as { code?: string; grounding?: GroundingInfo };
    if (err.code === "SourceNeedsChoice" && err.grounding) return { needsChoice: err.grounding };
  }
  if (!res.ok) {
    throw new Error(`ai-prompt returned ${res.status}: ${await res.text()}`);
  }
  const { prompt, grounding } = (await res.json()) as { prompt?: string; grounding?: GroundingInfo | null };
  if (!prompt || prompt.length < 200) {
    throw new Error(`ai-prompt returned an implausibly short prompt (${prompt?.length ?? 0} chars).`);
  }
  // JSON mode 400s without the word, and the provider asserts the same thing before sending.
  // If this ever trips, the prompt did not come from AiPromptBuilder.
  if (!prompt.toLowerCase().includes("json")) {
    throw new Error("The fetched prompt contains no 'json' — it is not the production prompt.");
  }
  return { prompt, grounding: grounding ?? null };
}

interface ModelReply {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

async function callModel(prompt: string, attempt = 1): Promise<ModelReply> {
  const res = await fetchWithRetry(`${VENDOR.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${VENDOR.apiKey}` },
    body: JSON.stringify({
      model: VENDOR.model,
      messages: [{ role: "user", content: prompt }],
      temperature: SAMPLING.temperature,
      seed: SAMPLING.seed,
      max_tokens: VENDOR.maxOutputTokens,
      response_format: { type: "json_object" },
      ...(VENDOR.reasoningEffort ? { reasoning_effort: VENDOR.reasoningEffort } : {}),
      stream: false,
    }),
  }, "model");

  // A 429 is the vendor saying "later", not "no". It carries the wait, so take it: losing a
  // topic to a limit that clears in four seconds is throwing away a measurement for nothing.
  if (res.status === 429 && attempt < 3) {
    const body = await res.text();
    const header = Number(res.headers.get("retry-after"));
    const fromBody = Number(/try again in ([0-9.]+)s/i.exec(body)?.[1]);
    const waitSeconds = [header, fromBody].find((n) => Number.isFinite(n) && n > 0) ?? 20;
    const ms = Math.ceil(waitSeconds * 1000) + 1000;
    console.warn(`      rate limited — waiting ${(ms / 1000).toFixed(1)}s and retrying (attempt ${attempt + 1}/3)`);
    await sleep(ms);
    return callModel(prompt, attempt + 1);
  }

  if (!res.ok) {
    const retryAfter = res.headers.get("retry-after");
    const hint = retryAfter ? ` — vendor asked for ${retryAfter}s` : "";
    throw new Error(`Model call returned ${res.status}${hint}: ${(await res.text()).slice(0, 400)}`);
  }
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    content: body.choices?.[0]?.message?.content ?? "",
    inputTokens: body.usage?.prompt_tokens ?? 0,
    outputTokens: body.usage?.completion_tokens ?? 0,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Keeps the run inside the vendor's tokens-per-minute ceiling.
 *
 * A fixed delay cannot do this. Cost per call varies by about a quarter between languages, and
 * the vendor's window is rolling, so the only honest way to pace is to remember what was
 * actually spent and wait until enough of it has aged out.
 *
 * The estimate for the *next* call is the largest seen so far, because being wrong in the other
 * direction costs a 429 and a lost topic.
 */
class TokenPacer {
  private readonly spent: { at: number; tokens: number }[] = [];
  private largest = 3000; // Before anything is measured: a touch above a long Albanian reply.

  constructor(private readonly limitPerMinute: number) {}

  record(tokens: number): void {
    this.spent.push({ at: Date.now(), tokens });
    if (tokens > this.largest) this.largest = tokens;
  }

  /** Waits, if the next call would not fit in the window. Returns how long it waited. */
  async waitForRoom(): Promise<number> {
    const windowMs = 60_000;
    let waited = 0;
    for (;;) {
      const cutoff = Date.now() - windowMs;
      while (this.spent.length > 0 && this.spent[0].at < cutoff) this.spent.shift();

      const used = this.spent.reduce((sum, e) => sum + e.tokens, 0);
      if (used + this.largest <= this.limitPerMinute || this.spent.length === 0) return waited;

      // Wait until the oldest entry leaves the window, plus a small margin for clock skew.
      const ms = this.spent[0].at + windowMs - Date.now() + 250;
      if (ms <= 0) continue;
      await sleep(ms);
      waited += ms;
    }
  }
}

async function main(): Promise<void> {
  requireEnv();

  const languageMode = arg("language-mode", "inferred") as LanguageMode;
  if (languageMode !== "inferred" && languageMode !== "pinned") {
    throw new Error(`--language-mode must be 'inferred' or 'pinned', got '${languageMode}'.`);
  }

  // `--grounding`: build every prompt grounded, answering the server's questions as an author
  // would. Needs Ai__Source__Enabled=true on the API — checked on the first topic below.
  const grounding = process.argv.includes("--grounding");

  const runId = arg(
    "run-id",
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${languageMode}${grounding ? "-grounded" : ""}`,
  );
  const runDir = path.join(RUNS_ROOT, runId);

  const file = JSON.parse(await fs.readFile(TOPICS_FILE, "utf8")) as TopicsFile;

  // `--only=sq-01,sq-04` reruns a subset. The topic list is ordered by language, so a failure
  // that starts partway down is ambiguous between "this language fails" and "everything after
  // the Nth call fails" — rerunning the failures from a cold start tells the two apart.
  const only = arg("only", "").split(",").map((s) => s.trim()).filter(Boolean);
  const topics = only.length > 0 ? file.topics.filter((t) => only.includes(t.id)) : file.topics;
  if (topics.length === 0) {
    throw new Error(`--only matched no topics. Ids in topics.json: ${file.topics.map((t) => t.id).join(", ")}`);
  }

  await preflight();
  const token = await login();

  // A grounded run against an API that isn't grounding would measure the baseline again and
  // call it grounding. Ask once, before any directory or model call, rather than failing every
  // topic in turn.
  if (grounding) {
    const probe = await promptFor(token, topics[0], buildRequest(topics[0], file.defaults, languageMode, true));
    if (probe.grounding === null) {
      throw new Error(
        "--grounding was given but the API answered without grounding. Either:\n" +
          "  - it is running a build from before grounding existed: pull, rebuild and restart it; or\n" +
          "  - Ai:Source:Enabled is not reaching it. An $env: variable only reaches an API started from\n" +
          "    that same terminal, never one started from Visual Studio. This works for both:\n" +
          '      cd OxygenBackend/QuizAPI; dotnet user-secrets set "Ai:Source:Enabled" "true"\n' +
          "    then restart the API.",
      );
    }
  }

  // Only now. Creating the directory before the gates above left an empty run behind every time
  // a start failed — and since the later steps default to the most recently modified run, that
  // empty directory is exactly what they would pick up next.
  await fs.mkdir(path.join(runDir, "raw"), { recursive: true });

  console.log(`run        ${runId}`);
  console.log(`model      ${VENDOR.model} @ temperature ${SAMPLING.temperature}, seed ${SAMPLING.seed}`);
  console.log(`language   ${languageMode}`);
  console.log(`grounding  ${grounding ? "on" : "off"}`);
  console.log(`pacing     ${TPM_LIMIT} tokens/min ceiling, ${THROTTLE_MS}ms floor between topics`);
  console.log(`topics     ${topics.length}${only.length > 0 ? ` (filtered from ${file.topics.length})` : ""}\n`);

  const failures: { id: string; error: string }[] = [];
  const pacer = new TokenPacer(TPM_LIMIT);

  for (const [i, topic] of topics.entries()) {
    const label = `[${i + 1}/${topics.length}] ${topic.id}`;
    try {
      const built = buildRequest(topic, file.defaults, languageMode, grounding);
      const { prompt, grounding: groundingInfo, asks, request } = await promptFor(token, topic, built);
      // Checked up front as well; this catches an API restarted mid-run with grounding off.
      if (grounding && groundingInfo === null) {
        throw new Error("The API stopped grounding partway through the run — was it restarted?");
      }

      const waited = await pacer.waitForRoom();
      if (waited > 0) console.log(`      paused ${(waited / 1000).toFixed(1)}s to stay under ${TPM_LIMIT} tokens/min`);

      const reply = await callModel(prompt);
      pacer.record(reply.inputTokens + reply.outputTokens);

      await fs.writeFile(
        path.join(runDir, "raw", `${topic.id}.json`),
        JSON.stringify({ topic, request, prompt, reply, languageMode, grounding: groundingInfo, asks }, null, 2),
      );
      const source = groundingInfo?.source
        ? `grounded on "${groundingInfo.source.title}"`
        : groundingInfo
          ? `ungrounded (${groundingInfo.reason ?? "?"})`
          : "";
      const asked = asks.length > 0 ? `, asked ${asks.map((a) => a.kind).join(" + ")}` : "";
      console.log(`${label}  ok  (${reply.outputTokens} output tokens${source ? `, ${source}` : ""}${asked})`);
    } catch (err) {
      const message = describeError(err);
      failures.push({ id: topic.id, error: message });
      console.error(`${label}  FAILED  ${message}`);
    }
    if (i < topics.length - 1) await sleep(THROTTLE_MS);
  }

  await fs.writeFile(
    path.join(runDir, "run.json"),
    JSON.stringify(
      {
        runId,
        startedAt: new Date().toISOString(),
        languageMode,
        grounding,
        vendor: { baseUrl: VENDOR.baseUrl, model: VENDOR.model, reasoningEffort: VENDOR.reasoningEffort },
        sampling: SAMPLING,
        topicCount: file.topics.length,
        failures,
        // Recorded so a run can be tied to the code that produced it. A run from a dirty tree
        // is not comparable to anything.
        commit: process.env.EVAL_COMMIT ?? "unknown",
      },
      null,
      2,
    ),
  );

  console.log(`\nwrote ${path.relative(REPO_ROOT, runDir)}`);
  if (failures.length > 0) console.log(`${failures.length} topic(s) failed — see run.json`);
  console.log(`next: npx vite-node eval/src/parse.ts -- --run-id=${runId}`);
}

main().catch((err) => {
  console.error(describeError(err));
  process.exit(1);
});
