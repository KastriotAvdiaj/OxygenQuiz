#!/usr/bin/env node
/**
 * Builds a fact pack's facts from Wikidata (docs/quiz/fact-quizzes.md).
 *
 *   npm run facts:build -- capitals-of-europe        # one pack
 *   npm run facts:build -- --all                     # every pack
 *   npm run facts:build -- peaks-of-albania --dry    # report only, write nothing
 *
 * Reads OxygenBackend/QuizAPI/FactPacks/<slug>.json, runs its `query`, fetches English and
 * Albanian labels and aliases for every item, applies the quality gates below, and writes
 * `builtAt` and `facts` back into the same file. Everything else in the file is left as it is.
 *
 * WHY OFFLINE. The Wikidata Query Service is too slow and too throttled to call while a quiz is
 * being made: measured 2026-10-30, one server was limited to a request a minute during an outage,
 * and queries walking the class tree took 29–46 s or timed out. Two requests per pack, run by a
 * person, is well inside any limit. The output is committed and reviewed as a diff.
 *
 * GATES — a fact is dropped, never guessed:
 *   - fewer sitelinks than the pack's `minSitelinks` (nobody has heard of it);
 *   - more than one distinct value for the same item (Lake Shkodër had 530 and 26,535 km²);
 *   - a quantity that isn't a finite number.
 * A missing label in one language is not a drop: the fact is kept, and the server simply doesn't
 * use it for a quiz in that language. A label is never filled in from another language — only
 * from the pack's `labelOverrides`, which a person wrote (Oslo has no Albanian label on Wikidata;
 * "Kingdom of the Netherlands" is the right item but the wrong name for a question).
 *
 * No dependencies — Node 18+ has fetch — so it runs on any machine with the repo.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PACKS = path.join(ROOT, "OxygenBackend/QuizAPI/FactPacks");
const ENDPOINT = "https://query.wikidata.org/sparql";
// Wikimedia's policy: a descriptive agent with a way to reach us, or expect 403/429.
const USER_AGENT = "OxygenQuiz-facts/1.0 (https://oxygenquiz.com; fact pack build)";
/** Our language names (QuestionLanguages rows) to Wikidata language codes. */
const LANGUAGES = { English: "en", Albanian: "sq" };

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const all = args.includes("--all");
const slugs = all
  ? (await readdir(PACKS)).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5))
  : args.filter((a) => !a.startsWith("--"));

if (slugs.length === 0) {
  console.error("Name a pack (its file name without .json), or pass --all.");
  process.exit(1);
}

for (const slug of slugs) await build(slug);

async function build(slug) {
  const file = path.join(PACKS, `${slug}.json`);
  const pack = JSON.parse(await readFile(file, "utf8"));
  console.log(`\n${slug}`);

  const rows = await sparql(pack.query);
  const report = { rows: rows.length, unknown: 0, conflict: 0, unpopular: 0, notNumber: 0 };

  // One item, one value: anything else is a conflict and the item goes.
  const byItem = new Map();
  for (const row of rows) {
    const item = qid(row.item);
    if (!item) { report.unknown++; continue; }
    const entry = byItem.get(item) ?? { item, values: new Set(), sitelinks: Number(row.sitelinks ?? 0) };
    entry.values.add(pack.kind === "quantity" ? String(Number(row.value)) : qid(row.value) ?? row.value);
    byItem.set(item, entry);
  }

  const kept = [];
  for (const entry of byItem.values()) {
    if (entry.values.size !== 1) { report.conflict++; console.log(`  conflict: ${entry.item} → ${[...entry.values].join(", ")}`); continue; }
    if (entry.sitelinks < (pack.minSitelinks ?? 0)) { report.unpopular++; continue; }
    const [value] = entry.values;
    if (pack.kind === "quantity" && !Number.isFinite(Number(value))) { report.notNumber++; continue; }
    kept.push({ item: entry.item, value, sitelinks: entry.sitelinks });
  }

  // Labels and aliases for every subject, and every value when values are items.
  const ids = new Set(kept.map((f) => f.item));
  if (pack.kind !== "quantity") kept.forEach((f) => ids.add(f.value));
  const names = await labels([...ids]);
  // A person's word beats Wikidata's: overrides replace the label, keep the aliases.
  for (const [id, byLanguage] of Object.entries(pack.labelOverrides ?? {})) {
    if (id.startsWith("$")) continue;
    const entry = names.get(id) ?? {};
    for (const [language, label] of Object.entries(byLanguage)) {
      entry[language] = { label, aliases: entry[language]?.aliases ?? [] };
    }
    names.set(id, entry);
  }

  const facts = kept
    .sort((a, b) => b.sitelinks - a.sitelinks || a.item.localeCompare(b.item))
    .map((f) => {
      const fact = { subject: f.item, sitelinks: f.sitelinks };
      if (pack.kind === "quantity") fact.amount = round(Number(f.value));
      else fact.value = f.value;
      fact.labels = {};
      for (const language of Object.keys(LANGUAGES)) {
        const subject = names.get(f.item)?.[language];
        const value = pack.kind === "quantity" ? null : names.get(f.value)?.[language];
        if (!subject?.label || (pack.kind !== "quantity" && !value?.label)) continue;
        fact.labels[language] = pack.kind === "quantity"
          ? { subject: subject.label }
          : { subject: subject.label, value: value.label, valueAliases: value.aliases };
      }
      return fact;
    });

  for (const language of Object.keys(LANGUAGES)) {
    const missing = facts.filter((f) => !f.labels[language]).map((f) => f.subject);
    console.log(`  ${language}: ${facts.length - missing.length} usable${missing.length ? ` (no label: ${missing.join(", ")})` : ""}`);
  }
  console.log(`  rows ${report.rows} → kept ${facts.length}; dropped: conflict ${report.conflict}, below ${pack.minSitelinks ?? 0} sitelinks ${report.unpopular}, not a number ${report.notNumber}`);

  if (dry) return;
  pack.builtAt = new Date().toISOString().slice(0, 10);
  pack.facts = facts;
  await writeFile(file, JSON.stringify(pack, null, 2) + "\n", "utf8");
  console.log(`  wrote ${path.relative(ROOT, file)}`);
}

/** Labels and filtered aliases, by item and language. One request for all of them. */
async function labels(ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const rows = await sparql(`
      SELECT ?x ?text ?lang ?kind WHERE {
        VALUES ?x { ${chunk.map((id) => `wd:${id}`).join(" ")} }
        { ?x rdfs:label ?text BIND("label" AS ?kind) } UNION { ?x skos:altLabel ?text BIND("alias" AS ?kind) }
        BIND(LANG(?text) AS ?lang) FILTER(?lang IN (${Object.values(LANGUAGES).map((c) => `"${c}"`).join(",")}))
      }`);
    for (const row of rows) {
      const language = Object.keys(LANGUAGES).find((l) => LANGUAGES[l] === row.lang);
      const id = qid(row.x);
      const entry = out.get(id) ?? {};
      const names = (entry[language] ??= { label: null, aliases: [] });
      if (row.kind === "label") names.label = row.text;
      else if (usableAlias(row.text)) names.aliases.push(row.text);
      out.set(id, entry);
    }
  }
  // An alias equal to the label is no extra answer.
  for (const entry of out.values())
    for (const names of Object.values(entry))
      names.aliases = [...new Set(names.aliases)].filter((a) => a.toLowerCase() !== names.label?.toLowerCase()).sort();
  return out;
}

/**
 * Whether an alias is a name a person might type. Kosovo's aliases include "XK", "KOS" and a
 * flag emoji alongside "Kosova" — codes and symbols are not answers.
 */
function usableAlias(text) {
  if (!text || text.length < 3) return false;
  if (/^[A-Z0-9]{2,6}$/.test(text)) return false; // country, airport and UN/LOCODE codes ("NOOSL")
  // Latin script only: both quiz languages are written in it, and "Београд" is not something a
  // player in either will type.
  return /^\p{Script=Latin}[\p{Script=Latin}\p{M}\s.'’-]*$/u.test(text);
}

async function sparql(query) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${ENDPOINT}?${new URLSearchParams({ query, format: "json" })}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/sparql-results+json" },
    });
    if (response.ok) {
      const body = await response.json();
      return body.results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
    }
    // 429 carries Retry-After; the throttle seen in 2026 was a minute.
    const wait = Number(response.headers.get("retry-after") ?? 60);
    if (attempt >= 3 || (response.status !== 429 && response.status < 500)) {
      throw new Error(`Wikidata answered ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
    console.log(`  Wikidata answered ${response.status}; waiting ${wait}s`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
}

function qid(uri) {
  const match = /\/entity\/(Q\d+)$/.exec(uri ?? "");
  return match ? match[1] : null;
}

/** Whole numbers stay whole; the rest keep one decimal. Elevations are never more precise than that. */
function round(n) {
  return Number.isInteger(n) ? n : Math.round(n * 10) / 10;
}
