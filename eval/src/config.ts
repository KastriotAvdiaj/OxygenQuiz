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
 * Minimum milliseconds between generations — a floor, not the real pacing. `TPM_LIMIT` below
 * does the actual work.
 *
 * This was 8000 and that was arithmetic done badly: the free tier's ceiling is 8,000 tokens per
 * minute, and one Albanian generation costs about 2,700 (prompt plus reply), so spacing calls 8s
 * apart asks for roughly 20,000 tokens a minute. It survived six English topics and failed on
 * the twelfth.
 */
export const THROTTLE_MS = Number(env.EVAL_THROTTLE_MS ?? 5000);

/**
 * Tokens per minute the vendor will allow. The harness keeps a rolling 60-second window of what
 * it has actually spent and waits when the next call would not fit.
 *
 * Pacing on measured usage rather than a fixed delay matters because the cost per call is not
 * constant: Albanian runs about 1.23× English (docs/quiz/ai-quiz-generation-flow.md §2c), so any
 * single delay is either too slow for English or too fast for Albanian. Groq's free tier is
 * 8,000; the Dev tier is higher, and raising this is the first thing to change after upgrading.
 */
export const TPM_LIMIT = Number(env.EVAL_TPM_LIMIT ?? 8000);

/** Self-signed dev certificate. Set EVAL_INSECURE_TLS=1 when pointing at localhost. */
export const INSECURE_TLS = env.EVAL_INSECURE_TLS === "1";

/**
 * Which run a command operates on.
 *
 * Takes `--run-id` when given, the most recently modified run when not. Omitting it is the
 * common case — you almost always mean the run you just produced — and typing a timestamped id
 * by hand invites exactly the transcription error it is there to avoid.
 *
 * Angle brackets are stripped because documentation writes placeholders as `<run-id>` and they
 * get copied verbatim; `mkdir '<2026-10-28T…>'` is a worse error message than it needs to be.
 */
export function resolveRunId(raw: string | undefined): string {
  const cleaned = raw?.replace(/^<+/, "").replace(/>+$/, "").trim();
  if (cleaned) return cleaned;

  let entries: string[];
  try {
    entries = fs
      .readdirSync(RUNS_ROOT, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      // "The most recent run" has to mean the most recent run that holds something. A directory
      // with no replies in it is debris — a failed start, or a mistyped --run-id — and silently
      // picking it is how one typo breaks the next three commands.
      .filter((name) => {
        try {
          return fs
            .readdirSync(path.join(RUNS_ROOT, name, "raw"))
            .some((f) => f.endsWith(".json"));
        } catch {
          return false;
        }
      });
  } catch {
    throw new Error(`No runs directory at ${RUNS_ROOT}. Run the generate step first.`);
  }
  if (entries.length === 0) throw new Error("No runs with any replies in them yet. Run the generate step first.");

  const latest = entries
    .map((name) => ({ name, at: fs.statSync(path.join(RUNS_ROOT, name)).mtimeMs }))
    .sort((a, b) => b.at - a.at)[0]!.name;

  console.log(`run-id not given — using the most recent run: ${latest}\n`);
  return latest;
}

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
