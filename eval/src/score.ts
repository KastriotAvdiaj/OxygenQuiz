/**
 * Stage 3 — turn the labelled rows into the two numbers that matter, with an honest interval
 * around them.
 *
 * **Error rate and yield are reported together, always.** A pipeline that drops every question
 * has a perfect error rate; one that keeps everything has a perfect yield. Either number alone
 * can be improved by making the product worse, which is why the accuracy plan insists on the
 * pair.
 *
 * The Wilson interval is here because the sample is small and the temptation to over-read it is
 * large. Two wrong answers out of 50 is "4%", but the interval runs from roughly 0.5% to 14% —
 * wide enough that a later run showing 8% has told you nothing.
 *
 * Usage:  npx vite-node eval/src/score.ts -- --run-id=NAME [--compare=OTHER_RUN]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { REPO_ROOT, RUNS_ROOT, resolveRunId } from "./config";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

interface LabelRow {
  rowId: string;
  correctness: string;
  observedLanguage: string;
  fluency: number | "";
  note: string;
}

interface KeyRow {
  topicId: string;
  intendedLanguage: string;
  languageMode: string;
  type: string;
}

/** Wilson score interval at 95%, which behaves sanely at small n and near 0 where normal does not. */
function wilson(successes: number, n: number): [number, number] {
  if (n === 0) return [0, 0];
  const z = 1.959964;
  const p = successes / n;
  const d = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, (centre - spread) / d), Math.min(1, (centre + spread) / d)];
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function rate(successes: number, n: number): string {
  if (n === 0) return "n/a (0 labelled)";
  const [lo, hi] = wilson(successes, n);
  return `${pct(successes / n)}  (${successes}/${n}, 95% CI ${pct(lo)}–${pct(hi)})`;
}

function tally<T extends string>(values: T[]): [T, number][] {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

async function loadRun(runId: string) {
  const runDir = path.join(RUNS_ROOT, runId);
  const labelText = await fs.readFile(path.join(runDir, "labels.jsonl"), "utf8");
  const labels = labelText
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as LabelRow);
  const key = JSON.parse(await fs.readFile(path.join(runDir, "key.json"), "utf8")) as Record<string, KeyRow>;
  const stages = JSON.parse(await fs.readFile(path.join(runDir, "stages.json"), "utf8")) as Record<
    string,
    { requested: number; returned: number; kept: number; dropped: string[] }
  >;
  const meta = JSON.parse(await fs.readFile(path.join(runDir, "run.json"), "utf8")) as {
    languageMode: string;
    vendor: { model: string };
    sampling: { temperature: number; seed: number };
  };
  return { runDir, labels, key, stages, meta };
}

function report(runId: string, data: Awaited<ReturnType<typeof loadRun>>): string {
  const { labels, key, stages, meta } = data;

  const requested = Object.values(stages).reduce((s, t) => s + t.requested, 0);
  const returned = Object.values(stages).reduce((s, t) => s + t.returned, 0);
  const kept = Object.values(stages).reduce((s, t) => s + t.kept, 0);

  const labelled = labels.filter((l) => l.correctness !== "");
  const wrong = labelled.filter((l) => l.correctness === "wrong");
  const ambiguous = labelled.filter((l) => l.correctness === "ambiguous");
  const stale = labelled.filter((l) => l.correctness === "time-sensitive");

  const lines: string[] = [];
  lines.push(`# Eval run \`${runId}\``);
  lines.push("");
  lines.push(
    `Model \`${meta.vendor.model}\`, temperature ${meta.sampling.temperature}, seed ${meta.sampling.seed}, ` +
      `language mode **${meta.languageMode}**. Labelled ${labelled.length} of ${labels.length} kept questions.`,
  );
  lines.push("");

  lines.push("## Yield — how much of what you asked for survives");
  lines.push("");
  lines.push("| stage | count | of requested |");
  lines.push("|---|---:|---:|");
  lines.push(`| requested | ${requested} | 100% |`);
  lines.push(`| returned by the model | ${returned} | ${pct(returned / Math.max(1, requested))} |`);
  lines.push(`| kept by the parser | ${kept} | ${pct(kept / Math.max(1, requested))} |`);
  lines.push("");

  lines.push("## Error rate — of the questions an author would actually see");
  lines.push("");
  lines.push(`- **wrong**: ${rate(wrong.length, labelled.length)}`);
  lines.push(`- ambiguous: ${rate(ambiguous.length, labelled.length)}`);
  lines.push(`- time-sensitive: ${rate(stale.length, labelled.length)}`);
  lines.push("");
  if (labelled.length < 100) {
    lines.push(
      `> Only ${labelled.length} questions are labelled. Read the intervals, not the point estimates — ` +
        `at this size a change of several points is indistinguishable from noise.`,
    );
    lines.push("");
  }

  lines.push("## Language — did it write in the language it was supposed to?");
  lines.push("");
  const byLanguage = new Map<string, LabelRow[]>();
  for (const l of labels) {
    const intended = key[l.rowId]?.intendedLanguage ?? "unknown";
    byLanguage.set(intended, [...(byLanguage.get(intended) ?? []), l]);
  }
  lines.push("| intended | kept | wrong answer | wrong language | mean fluency (1–4) |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const [intended, rows] of [...byLanguage.entries()].sort()) {
    const done = rows.filter((r) => r.correctness !== "");
    const bad = done.filter((r) => r.correctness === "wrong").length;
    const langJudged = rows.filter((r) => r.observedLanguage !== "");
    const offLanguage = langJudged.filter((r) => r.observedLanguage !== intended).length;
    const fluencies = rows.map((r) => r.fluency).filter((f): f is number => typeof f === "number");
    const meanFluency =
      fluencies.length > 0 ? (fluencies.reduce((a, b) => a + b, 0) / fluencies.length).toFixed(2) : "–";
    lines.push(
      `| ${intended} | ${rows.length} | ${done.length ? `${bad}/${done.length}` : "–"} | ` +
        `${langJudged.length ? `${offLanguage}/${langJudged.length}` : "–"} | ${meanFluency} |`,
    );
  }
  lines.push("");

  // Per topic, because this is the cut that says what to do next. Language tells you which
  // half is worse and type tells you which shape is worse, but neither distinguishes "the model
  // does not know this subject" from "the model is unreliable in general" — and those have
  // completely different fixes. The first run made the point: every English error sat in three
  // of six topics.
  lines.push("## Per topic — where the errors actually are");
  lines.push("");
  lines.push("| topic | labelled | wrong | ambiguous | defective | mean fluency |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  const byTopic = new Map<string, LabelRow[]>();
  for (const l of labels) {
    const t = key[l.rowId]?.topicId ?? "unknown";
    byTopic.set(t, [...(byTopic.get(t) ?? []), l]);
  }
  const topicRows = [...byTopic.entries()]
    .map(([topic, rows]) => {
      const done = rows.filter((r) => r.correctness !== "");
      const wrong = done.filter((r) => r.correctness === "wrong").length;
      const amb = done.filter((r) => r.correctness === "ambiguous").length;
      const fl = rows.map((r) => r.fluency).filter((f): f is number => typeof f === "number");
      return {
        topic,
        n: done.length,
        wrong,
        amb,
        defective: wrong + amb,
        fluency: fl.length > 0 ? (fl.reduce((a, b) => a + b, 0) / fl.length).toFixed(2) : "–",
      };
    })
    .sort((a, b) => b.defective - a.defective || b.wrong - a.wrong);
  for (const t of topicRows) {
    const share = t.n > 0 ? ` (${pct(t.defective / t.n)})` : "";
    lines.push(
      `| ${t.topic} | ${t.n} | ${t.wrong} | ${t.amb} | **${t.defective}**${share} | ${t.fluency} |`,
    );
  }
  lines.push("");
  const clean = topicRows.filter((t) => t.wrong === 0).map((t) => t.topic);
  if (clean.length > 0 && clean.length < topicRows.length) {
    lines.push(
      `No wrong answers at all in: ${clean.map((t) => `\`${t}\``).join(", ")}. ` +
        `A failure that concentrates in some subjects and not others is a knowledge problem, ` +
        `which grounding addresses; one spread evenly is not.`,
    );
    lines.push("");
  }

  lines.push("## Why the parser dropped things");
  lines.push("");
  const allDrops = Object.values(stages).flatMap((t) => t.dropped);
  if (allDrops.length === 0) {
    lines.push("Nothing was dropped.");
  } else {
    lines.push("| reason | count |");
    lines.push("|---|---:|");
    // Reasons embed the offending text, so group by the stable prefix rather than the whole string.
    for (const [reason, n] of tally(allDrops.map((d) => d.split(" (")[0].replace(/"[^"]*"/g, "…")))) {
      lines.push(`| ${reason} | ${n} |`);
    }
  }
  lines.push("");

  lines.push("## Per question type");
  lines.push("");
  lines.push("| type | labelled | wrong |");
  lines.push("|---|---:|---:|");
  const byType = new Map<string, LabelRow[]>();
  for (const l of labelled) {
    const t = key[l.rowId]?.type ?? "unknown";
    byType.set(t, [...(byType.get(t) ?? []), l]);
  }
  for (const [type, rows] of [...byType.entries()].sort()) {
    lines.push(`| ${type} | ${rows.length} | ${rate(rows.filter((r) => r.correctness === "wrong").length, rows.length)} |`);
  }
  lines.push("");

  const notes = labels.filter((l) => l.note.trim().length > 0);
  if (notes.length > 0) {
    lines.push("## Labeller notes");
    lines.push("");
    for (const n of notes) {
      lines.push(`- \`${n.rowId}\` (${key[n.rowId]?.topicId ?? "?"}, ${n.correctness || "unlabelled"}): ${n.note}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main(): Promise<void> {
  const runId = resolveRunId(arg("run-id"));
  const data = await loadRun(runId);
  let out = report(runId, data);

  const compare = arg("compare")?.replace(/^<+/, "").replace(/>+$/, "").trim();
  if (compare) {
    out += "\n---\n\n" + report(compare, await loadRun(compare));
    out +=
      "\n> Two runs are comparable only if their intervals barely overlap. " +
      "Overlapping intervals mean the difference has not been demonstrated.\n";
  }

  const outPath = path.join(data.runDir, "report.md");
  await fs.writeFile(outPath, out);
  console.log(out);
  console.log(`\nwrote ${path.relative(REPO_ROOT, outPath)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
