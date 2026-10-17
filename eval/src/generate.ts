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

async function login(): Promise<string> {
  const res = await fetch(`${API_URL}/Authentication/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: API_USER.email, password: API_USER.password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed (${res.status}). Check EVAL_API_EMAIL / EVAL_API_PASSWORD.`);
  }
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error("Login succeeded but returned no token.");
  return body.token;
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
  const res = await fetch(`${API_URL}/quiz/ai-prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
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
  const res = await fetch(`${VENDOR.baseUrl.replace(/\/$/, "")}/chat/completions`, {
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
  });
  if (!res.ok) {
    throw new Error(`Model call returned ${res.status}: ${(await res.text()).slice(0, 400)}`);
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
  const token = await login();

  console.log(`run        ${runId}`);
  console.log(`model      ${VENDOR.model} @ temperature ${SAMPLING.temperature}, seed ${SAMPLING.seed}`);
  console.log(`language   ${languageMode}`);
  console.log(`topics     ${file.topics.length}\n`);

  const failures: { id: string; error: string }[] = [];

  for (const [i, topic] of file.topics.entries()) {
    const label = `[${i + 1}/${file.topics.length}] ${topic.id}`;
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
      const message = err instanceof Error ? err.message : String(err);
      failures.push({ id: topic.id, error: message });
      console.error(`${label}  FAILED  ${message}`);
    }
    if (i < file.topics.length - 1) await sleep(THROTTLE_MS);
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
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
