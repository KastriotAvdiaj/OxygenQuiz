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
function buildRequest(topic: TopicRow, defaults: TopicsFile["defaults"], mode: LanguageMode) {
  return {
    Mode: "Topic",
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

async function fetchPrompt(token: string, body: unknown): Promise<string> {
  const res = await fetchWithRetry(`${API_URL}/quiz/ai-prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }, "ai-prompt");
  if (!res.ok) {
    throw new Error(`ai-prompt returned ${res.status}: ${await res.text()}`);
  }
  const { prompt } = (await res.json()) as { prompt?: string };
  if (!prompt || prompt.length < 200) {
    throw new Error(`ai-prompt returned an implausibly short prompt (${prompt?.length ?? 0} chars).`);
  }
  // JSON mode 400s without the word, and the provider asserts the same thing before sending.
  // If this ever trips, the prompt did not come from AiPromptBuilder.
  if (!prompt.toLowerCase().includes("json")) {
    throw new Error("The fetched prompt contains no 'json' — it is not the production prompt.");
  }
  return prompt;
}

interface ModelReply {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

async function callModel(prompt: string): Promise<ModelReply> {
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
  if (!res.ok) {
    // The free tier's tokens-per-minute ceiling is the likeliest failure on a 12-topic run, and
    // it answers with a Retry-After the caller can act on. Say the number rather than leave
    // someone guessing at EVAL_THROTTLE_MS.
    const retryAfter = res.headers.get("retry-after");
    const hint = retryAfter
      ? ` — vendor says retry after ${retryAfter}s; set EVAL_THROTTLE_MS above that`
      : "";
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

async function main(): Promise<void> {
  requireEnv();

  const languageMode = arg("language-mode", "inferred") as LanguageMode;
  if (languageMode !== "inferred" && languageMode !== "pinned") {
    throw new Error(`--language-mode must be 'inferred' or 'pinned', got '${languageMode}'.`);
  }

  const runId = arg("run-id", `${new Date().toISOString().replace(/[:.]/g, "-")}-${languageMode}`);
  const runDir = path.join(RUNS_ROOT, runId);
  await fs.mkdir(path.join(runDir, "raw"), { recursive: true });

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

  console.log(`run        ${runId}`);
  console.log(`model      ${VENDOR.model} @ temperature ${SAMPLING.temperature}, seed ${SAMPLING.seed}`);
  console.log(`language   ${languageMode}`);
  console.log(`throttle   ${THROTTLE_MS}ms between topics`);
  console.log(`topics     ${topics.length}${only.length > 0 ? ` (filtered from ${file.topics.length})` : ""}\n`);

  const failures: { id: string; error: string }[] = [];

  for (const [i, topic] of topics.entries()) {
    const label = `[${i + 1}/${topics.length}] ${topic.id}`;
    try {
      const request = buildRequest(topic, file.defaults, languageMode);
      const prompt = await fetchPrompt(token, request);
      const reply = await callModel(prompt);

      await fs.writeFile(
        path.join(runDir, "raw", `${topic.id}.json`),
        JSON.stringify({ topic, request, prompt, reply, languageMode }, null, 2),
      );
      console.log(`${label}  ok  (${reply.outputTokens} output tokens)`);
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
