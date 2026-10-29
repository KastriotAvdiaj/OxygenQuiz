/**
 * Stage 2 — push every raw reply through the **real** parser, then lay the survivors out for a
 * human to label.
 *
 * `parseAiOutput` is imported from the app, not reimplemented. It is the component that decides
 * what an author actually sees (docs/quiz/ai-question-accuracy-plan.md, constraint 1: "Anything
 * that drops a question must live in parse-ai-output.ts"), so a harness that scored the model's
 * raw JSON would be scoring something no user is ever shown — and would report a yield of 100%
 * by construction.
 *
 * The labelling file is **blind**. Rows are shuffled, carry an opaque id, and say nothing about
 * which topic, language mode or run produced them; the mapping lives beside it in `key.json`,
 * which only the scorer reads. Labelling 120 questions while knowing which half came from the
 * pipeline you are hoping to prove better is not a measurement.
 *
 * Usage:  npx vite-node eval/src/parse.ts -- --run-id=NAME
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { QuestionType, type QuestionDifficulty } from "@/types/question-types";
import {
  parseAiOutput,
  type ParseContext,
  type ParseResult,
} from "@/pages/Dashboard/Pages/Quiz/components/AI-Quiz/parse-ai-output";
import { REPO_ROOT, RUNS_ROOT, resolveRunId } from "./config";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

/**
 * Ids the parser needs but the measurement does not care about. The parser inherits them onto
 * every question and never interprets them; only `difficulties` does real work, because an
 * unmatched difficulty name is a silent fallback the report counts.
 */
function contextFor(difficultyNames: string[]): ParseContext {
  const difficulties: QuestionDifficulty[] = difficultyNames.map((level, i) => ({
    id: i + 1,
    level,
    weight: i + 1,
    createdAt: new Date(0).toISOString(),
  }));
  return {
    categoryId: 1,
    languageId: 1,
    quizDifficultyId: difficulties[0]?.id ?? 1,
    difficulties,
    sourceText: null, // Topic mode: the quote check has nothing to compare against and is skipped.
  };
}

/** What a labeller reads: the question exactly as the author would see it in the builder. */
interface LabelRow {
  rowId: string;
  type: string;
  text: string;
  /** The key, rendered per type, because judging "is this correct" needs the answer. */
  answer: string;
  options?: string[];
  explanation?: string;
  /** --- fill these in --- */
  correctness: "" | "correct" | "wrong" | "ambiguous" | "time-sensitive";
  observedLanguage: "" | "English" | "Albanian" | "Spanish" | "French" | "mixed" | "other";
  /** 1 clumsy / unidiomatic … 4 reads as a native wrote it. Leave blank if you cannot judge. */
  fluency: "" | 1 | 2 | 3 | 4;
  note: string;
}

function renderAnswer(q: unknown): { answer: string; options?: string[] } {
  const question = q as Record<string, unknown>;
  switch (question.type) {
    case QuestionType.MultipleChoice: {
      const opts = (question.answerOptions ?? []) as { text: string; isCorrect: boolean }[];
      return {
        answer: opts.filter((o) => o.isCorrect).map((o) => o.text).join(" | ") || "(none marked)",
        options: opts.map((o) => o.text),
      };
    }
    case QuestionType.TrueFalse:
      return { answer: String(question.correctAnswer) };
    case QuestionType.TypeTheAnswer: {
      const accepted = (question.acceptableAnswers ?? []) as { value: string }[];
      const extra = accepted.map((a) => a.value).filter(Boolean);
      return {
        answer: [String(question.correctAnswer), ...extra].join(" | "),
      };
    }
    default:
      return { answer: "(unknown type)" };
  }
}

/** Deterministic shuffle, so re-running parse on the same run gives the same labelling order. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function main(): Promise<void> {
  const runId = resolveRunId(arg("run-id"));
  const runDir = path.join(RUNS_ROOT, runId);
  const rawDir = path.join(runDir, "raw");
  const parsedDir = path.join(runDir, "parsed");

  // Read before creating anything. Creating `parsed/` first turned a mistyped --run-id into a
  // real directory, which then became "the most recent run" for the next command and failed
  // again — the typo outlived the command that made it.
  const files = await fs
    .readdir(rawDir)
    .then((f) => f.filter((n) => n.endsWith(".json")).sort())
    .catch(() => [] as string[]);

  if (files.length === 0) {
    // Say which runs do have something, rather than only that this one does not. Picking the
    // wrong run is easy when the id is a timestamp and the default is "most recent".
    const others = await Promise.all(
      (await fs.readdir(RUNS_ROOT, { withFileTypes: true }))
        .filter((e) => e.isDirectory())
        .map(async (e) => {
          const count = await fs
            .readdir(path.join(RUNS_ROOT, e.name, "raw"))
            .then((f) => f.filter((n) => n.endsWith(".json")).length)
            .catch(() => 0);
          return `  ${count === 0 ? "(empty)" : `${count} topic${count === 1 ? "" : "s"}`}  ${e.name}`;
        }),
    );
    throw new Error(
      `Run '${runId}' has no raw replies in ${rawDir}.\n\n` +
        `Runs available:\n${others.join("\n")}\n\n` +
        `Pick one with --run-id=<name>, or run the generate step to make a new one.`,
    );
  }

  await fs.mkdir(parsedDir, { recursive: true });

  const rows: LabelRow[] = [];
  const key: Record<string, unknown> = {};
  const perTopic: Record<string, { requested: number; returned: number; kept: number; dropped: string[] }> = {};

  for (const file of files) {
    const raw = JSON.parse(await fs.readFile(path.join(rawDir, file), "utf8")) as {
      topic: { id: string; language: string; topic: string };
      request: { QuestionCount: number; DifficultyNames: string[] };
      reply: { content: string };
      languageMode: string;
    };

    const result: ParseResult = parseAiOutput(raw.reply.content, contextFor(raw.request.DifficultyNames));
    await fs.writeFile(path.join(parsedDir, file), JSON.stringify(result, null, 2));

    // What the model emitted, before the parser decided. `QuestionsReturned` on the usage row
    // counts this number and calls it quality, which is the optimism noted in the accuracy plan.
    let returned = 0;
    try {
      const obj = JSON.parse(raw.reply.content) as { questions?: unknown[] };
      returned = Array.isArray(obj.questions) ? obj.questions.length : 0;
    } catch {
      returned = result.questions.length + result.dropped.length;
    }

    perTopic[raw.topic.id] = {
      requested: raw.request.QuestionCount,
      returned,
      kept: result.questions.length,
      dropped: result.dropped.map((d) => d.reason),
    };

    for (const [qIndex, parsed] of result.questions.entries()) {
      const rowId = crypto
        .createHash("sha256")
        .update(`${runId}:${raw.topic.id}:${qIndex}`)
        .digest("hex")
        .slice(0, 10);
      const { answer, options } = renderAnswer(parsed.question);
      rows.push({
        rowId,
        type: String(parsed.question.type),
        text: parsed.question.text,
        answer,
        ...(options ? { options } : {}),
        ...(parsed.question.explanation ? { explanation: parsed.question.explanation } : {}),
        correctness: "",
        observedLanguage: "",
        fluency: "",
        note: "",
      });
      key[rowId] = {
        topicId: raw.topic.id,
        topicText: raw.topic.topic,
        intendedLanguage: raw.topic.language,
        languageMode: raw.languageMode,
        qIndex,
        type: String(parsed.question.type),
      };
    }
  }

  const seed = Number.parseInt(crypto.createHash("sha256").update(runId).digest("hex").slice(0, 8), 16);
  const shuffled = shuffle(rows, seed);

  const labelsPath = path.join(runDir, "labels.jsonl");
  await fs.writeFile(labelsPath, shuffled.map((r) => JSON.stringify(r)).join("\n") + "\n");
  await fs.writeFile(path.join(runDir, "key.json"), JSON.stringify(key, null, 2));
  await fs.writeFile(path.join(runDir, "stages.json"), JSON.stringify(perTopic, null, 2));

  const requested = Object.values(perTopic).reduce((s, t) => s + t.requested, 0);
  const returned = Object.values(perTopic).reduce((s, t) => s + t.returned, 0);
  const kept = Object.values(perTopic).reduce((s, t) => s + t.kept, 0);

  console.log(`requested  ${requested}`);
  console.log(`returned   ${returned}  (what the model emitted)`);
  console.log(`kept       ${kept}  (what the parser let through — this is the yield numerator)`);
  console.log(`\nlabel these: ${path.relative(REPO_ROOT, labelsPath)}`);
  console.log(`then:        npx vite-node eval/src/score.ts -- --run-id=${runId}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
