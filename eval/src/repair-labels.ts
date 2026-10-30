/**
 * One-off: undo the `undefined` key written by the labelling page's first version.
 *
 * `chips()` was called without its field name, so every button click stored its value under a
 * key literally named `undefined` instead of `correctness` / `observedLanguage` / `fluency`.
 * The bug is fixed; this recovers what it swallowed.
 *
 * What can be recovered, and what cannot:
 * - **Notes** survive untouched — they were written through a different path.
 * - **A numeric value** under `undefined` can only have come from the fluency row, since the
 *   other two rows hold strings. It is moved to `fluency`.
 * - **Correctness is lost.** The key held only the most recent click, so an earlier correctness
 *   choice was overwritten by a later fluency one. Those questions need labelling again, which
 *   the page will offer: without a correctness value a row counts as unlabelled.
 *
 * Usage:  npm run eval:repair-labels [-- --run-id=NAME]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { RUNS_ROOT, resolveRunId } from "./config";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

async function main(): Promise<void> {
  const runId = resolveRunId(arg("run-id"));
  const file = path.join(RUNS_ROOT, runId, "labels.jsonl");

  const rows = (await fs.readFile(file, "utf8"))
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as Record<string, unknown>);

  let recoveredFluency = 0;
  let strandedStrings = 0;
  let keysRemoved = 0;
  let notesKept = 0;

  for (const row of rows) {
    if (!("undefined" in row)) continue;
    const stray = row["undefined"];
    keysRemoved++;
    delete row["undefined"];

    if (typeof stray === "number" && stray >= 1 && stray <= 4) {
      if (!row.fluency) {
        row.fluency = stray;
        recoveredFluency++;
      }
    } else if (typeof stray === "string" && stray.length > 0) {
      // A string could be either of the other two rows; guessing wrong would be worse than
      // asking for the question again.
      strandedStrings++;
    }
    if (typeof row.note === "string" && row.note.length > 0) notesKept++;
  }

  await fs.writeFile(file, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");

  const labelled = rows.filter((r) => r.correctness).length;
  console.log(`\nRepaired ${file}`);
  console.log(`  ${keysRemoved} stray 'undefined' key(s) removed`);
  console.log(`  ${recoveredFluency} fluency value(s) recovered`);
  if (strandedStrings > 0) console.log(`  ${strandedStrings} value(s) too ambiguous to place — label those again`);
  console.log(`  ${notesKept} note(s) kept`);
  console.log(`\n  ${labelled}/${rows.length} rows now count as labelled.`);
  console.log(`  Re-run 'npm run eval:label' — it opens at the first unlabelled question.\n`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
