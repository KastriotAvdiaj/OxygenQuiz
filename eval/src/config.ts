/**
 * Everything the harness reads from the environment, in one place.
 *
 * The harness talks to two services and holds no secrets of its own: your running API (for the
 * prompt — see `generate.ts` for why it is never built here) and the model vendor's
 * OpenAI-compatible endpoint. Both are configured the same way the app configures them, so a
 * run measures the vendor you actually ship.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The repository root: this file lives at eval/src/. */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Load `eval/.env` into `process.env`.
 *
 * Hand-rolled rather than pulling in `dotenv`, because the harness is three scripts and this is
 * fifteen lines. It cannot be left to the runner: Vite only exposes `VITE_`-prefixed variables,
 * and to `import.meta.env` rather than `process.env`, so nothing here would ever be read — and
 * Node refuses `--env-file` inside `NODE_OPTIONS`, so the npm scripts cannot pass it either.
 *
 * A variable already set in the real environment wins, so CI and one-off shell overrides
 * (`EVAL_AI_MODEL=... npm run eval:generate`) beat the file rather than being silently replaced.
 *
 * Must run before the constants below are evaluated — they read `process.env` at module load.
 */
function loadDotEnv(): void {
  const file = path.join(REPO_ROOT, "eval", ".env");
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return; // No .env: the real environment is expected to carry everything.
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key in process.env) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (value.length > 1 && /^(".*"|'.*')$/s.test(value)) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

loadDotEnv();

const env = process.env;
export const EVAL_ROOT = path.join(REPO_ROOT, "eval");
export const RUNS_ROOT = path.join(EVAL_ROOT, "runs");
export const TOPICS_FILE = path.join(EVAL_ROOT, "topics.json");

/** Your API, with the `/api` prefix the SPA's VITE_API_URL also carries. */
export const API_URL = env.EVAL_API_URL ?? "https://localhost:7153/api";

/**
 * An account on that API. Any verified account works — the harness never calls `ai-generate`,
 * so it never touches a quota — but a SuperAdmin is the safe default because `ai-prompt`
 * requires only authentication and an admin is guaranteed to have it.
 */
export const API_USER = {
  email: env.EVAL_API_EMAIL ?? "",
  password: env.EVAL_API_PASSWORD ?? "",
} as const;

/**
 * The model vendor. Defaults mirror `Ai:Vendors:groq` in appsettings.json so an unconfigured
 * run measures production's model rather than a surprise.
 */
export const VENDOR = {
  baseUrl: env.EVAL_AI_BASE_URL ?? "https://api.groq.com/openai/v1",
  apiKey: env.EVAL_AI_API_KEY ?? "",
  model: env.EVAL_AI_MODEL ?? "openai/gpt-oss-120b",
  reasoningEffort: env.EVAL_AI_REASONING_EFFORT ?? "low",
  maxOutputTokens: Number(env.EVAL_AI_MAX_OUTPUT_TOKENS ?? 4000),
} as const;

/**
 * Zero, not production's 0.3.
 *
 * Variety is a feature in production and noise in a measurement: at 0.3 two runs of the same
 * topic differ, so a changed error rate cannot be attributed to the change you made. The seed
 * is sent for the same reason — vendors honour it on a best-effort basis, which is better than
 * not asking.
 */
export const SAMPLING = {
  temperature: Number(env.EVAL_TEMPERATURE ?? 0),
  seed: Number(env.EVAL_SEED ?? 20261017),
} as const;

/**
 * Milliseconds between generations. The Groq free tier is ~250 requests/day and 8k tokens per
 * minute, and a 10-question reply is a sizeable chunk of that minute — a run that fires 12 of
 * them back to back gets a 413 with `rate_limit_exceeded`, which the app deliberately does not
 * retry.
 */
export const THROTTLE_MS = Number(env.EVAL_THROTTLE_MS ?? 8000);

/** Self-signed dev certificate. Set EVAL_INSECURE_TLS=1 when pointing at localhost. */
export const INSECURE_TLS = env.EVAL_INSECURE_TLS === "1";

export function requireEnv(): void {
  const missing: string[] = [];
  if (!API_USER.email) missing.push("EVAL_API_EMAIL");
  if (!API_USER.password) missing.push("EVAL_API_PASSWORD");
  if (!VENDOR.apiKey) missing.push("EVAL_AI_API_KEY");
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}.\n` +
        `See eval/README.md — copy eval/.env.example to eval/.env and fill it in.`,
    );
  }
}
