/**
 * A local labelling page, because 116 lines of hand-edited JSONL is how a baseline never gets
 * finished.
 *
 * Serves one question at a time with keyboard shortcuts and writes each verdict straight back to
 * `labels.jsonl`, so the file on disk is always current and the scorer needs no new input format.
 *
 * **It keeps the run blind.** The page shows the question, its answer and its explanation —
 * nothing about which topic, language or run produced it. That is the whole reason `parse.ts`
 * shuffles and anonymises, and a convenient UI that leaked the topic back would quietly undo it.
 *
 * No dependencies and no framework: Node's own http server and one inlined page. The harness is
 * three scripts and a measurement, and it should not grow a build step.
 *
 * Usage:  npm run eval:label [-- --run-id=NAME] [--port=5174]
 */
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { RUNS_ROOT, resolveRunId } from "./config";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

interface LabelRow {
  rowId: string;
  type: string;
  text: string;
  answer: string;
  options?: string[];
  explanation?: string;
  correctness: string;
  observedLanguage: string;
  fluency: number | "";
  note: string;
  [key: string]: unknown;
}

const PAGE = String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Eval labelling</title>
<style>
 :root{--bg:#0f1115;--card:#171a21;--line:#2a2f3a;--fg:#e6e8ee;--dim:#949aa8;--acc:#6ea8fe;
       --ok:#4ade80;--bad:#f87171;--amb:#fbbf24;--old:#a78bfa}
 @media(prefers-color-scheme:light){:root{--bg:#f6f7f9;--card:#fff;--line:#dfe3ea;--fg:#1a1d24;--dim:#5b6472}}
 *{box-sizing:border-box}
 body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
 .wrap{max-width:760px;margin:0 auto;padding:16px}
 header{display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
 .bar{flex:1;min-width:160px;height:7px;background:var(--line);border-radius:99px;overflow:hidden}
 .bar i{display:block;height:100%;background:var(--acc);transition:width .2s}
 .muted{color:var(--dim);font-size:13px}
 .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px;margin-bottom:14px}
 .type{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);margin-bottom:8px}
 .q{font-size:19px;font-weight:600;margin:0 0 14px}
 ul{margin:0 0 14px;padding-left:20px}
 li{margin:3px 0}
 .ans{background:rgba(110,168,254,.1);border-left:3px solid var(--acc);padding:9px 12px;border-radius:0 6px 6px 0;margin-bottom:10px}
 .exp{color:var(--dim);font-size:14px;font-style:italic}
 h3{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);margin:0 0 7px}
 .row{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}
 button.opt{background:transparent;border:1px solid var(--line);color:var(--fg);padding:8px 13px;border-radius:8px;cursor:pointer;font:inherit;font-size:14px}
 button.opt:hover{border-color:var(--acc)}
 button.opt[aria-pressed=true]{background:var(--acc);border-color:var(--acc);color:#0b0d12;font-weight:600}
 button.opt[aria-pressed=true][data-v=correct]{background:var(--ok);border-color:var(--ok)}
 button.opt[aria-pressed=true][data-v=wrong]{background:var(--bad);border-color:var(--bad)}
 button.opt[aria-pressed=true][data-v=ambiguous]{background:var(--amb);border-color:var(--amb)}
 button.opt[aria-pressed=true][data-v=time-sensitive]{background:var(--old);border-color:var(--old)}
 kbd{font:11px ui-monospace,monospace;border:1px solid var(--line);border-bottom-width:2px;border-radius:4px;padding:0 4px;color:var(--dim);margin-left:5px}
 textarea{width:100%;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:9px;font:inherit;resize:vertical}
 nav{display:flex;gap:9px;align-items:center}
 nav button{background:var(--card);border:1px solid var(--line);color:var(--fg);padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit}
 nav button:disabled{opacity:.4;cursor:default}
 .done{color:var(--ok)}
 .help{font-size:12px;color:var(--dim);margin-top:18px;line-height:1.8}
</style></head><body><div class="wrap">
<header>
  <strong id="pos"></strong>
  <div class="bar"><i id="prog"></i></div>
  <span class="muted" id="count"></span>
</header>
<div class="card">
  <div class="type" id="type"></div>
  <p class="q" id="q"></p>
  <ul id="opts"></ul>
  <div class="ans"><strong>Answer:</strong> <span id="ans"></span></div>
  <p class="exp" id="exp"></p>
</div>
<div class="card">
  <h3>Correctness</h3>
  <div class="row" id="correctness"></div>
  <h3>What language is it actually in?</h3>
  <div class="row" id="observedLanguage"></div>
  <h3>Fluency — 1 reads like machine translation, 4 like a native wrote it</h3>
  <div class="row" id="fluency"></div>
  <h3>Note</h3>
  <textarea id="note" rows="2" placeholder="Why, when the verdict isn't obvious."></textarea>
</div>
<nav>
  <button id="prev">&larr; Prev</button>
  <button id="next">Next &rarr;</button>
  <button id="skipto">Next unlabelled</button>
  <span class="muted" id="saved"></span>
</nav>
<p class="help">
  <kbd>1</kbd>–<kbd>4</kbd> correctness &nbsp;·&nbsp; <kbd>q</kbd><kbd>w</kbd><kbd>e</kbd><kbd>r</kbd> fluency 1–4
  &nbsp;·&nbsp; <kbd>a</kbd> English <kbd>s</kbd> Albanian <kbd>d</kbd> mixed <kbd>f</kbd> other
  &nbsp;·&nbsp; <kbd>&larr;</kbd><kbd>&rarr;</kbd> move &nbsp;·&nbsp; <kbd>n</kbd> next unlabelled
  <br>Saved to labels.jsonl on every click. Close the tab whenever — nothing is held in memory.
</p>
</div>
<script>
const CORRECTNESS = ["correct","wrong","ambiguous","time-sensitive"];
const LANGS = ["English","Albanian","Spanish","French","mixed","other"];
let rows = [], i = 0;

const el = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

function chips(host, values, field, labels) {
  host.innerHTML = "";
  values.forEach((v, n) => {
    const b = document.createElement("button");
    b.className = "opt"; b.dataset.v = v; b.type = "button";
    b.innerHTML = esc(labels ? labels[n] : v) + (field === "correctness" ? '<kbd>' + (n+1) + '</kbd>' : "");
    b.onclick = () => set(field, rows[i][field] === v ? "" : v);
    host.appendChild(b);
  });
}

function render() {
  const r = rows[i];
  el("pos").textContent = (i + 1) + " / " + rows.length;
  const done = rows.filter(x => x.correctness).length;
  el("count").textContent = done + " labelled";
  el("prog").style.width = (100 * done / rows.length) + "%";
  el("type").textContent = r.type;
  el("q").textContent = r.text;
  el("opts").innerHTML = (r.options || []).map(o => "<li>" + esc(o) + "</li>").join("");
  el("ans").textContent = r.answer;
  el("exp").textContent = r.explanation || "";
  for (const f of ["correctness","observedLanguage","fluency"]) {
    [...el(f).children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === String(r[f]))));
  }
  el("note").value = r.note || "";
  el("prev").disabled = i === 0;
  el("next").disabled = i === rows.length - 1;
}

async function save(patch) {
  Object.assign(rows[i], patch);
  render();
  el("saved").textContent = "saving…";
  await fetch("/api/row", {
    method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ rowId: rows[i].rowId, patch }),
  });
  el("saved").textContent = "saved";
  el("saved").className = "muted done";
  setTimeout(() => { el("saved").textContent = ""; }, 900);
}
const set = (field, value) => save({ [field]: value });

function go(n) { i = Math.max(0, Math.min(rows.length - 1, n)); render(); }
function nextUnlabelled() {
  const n = rows.findIndex((r, n2) => n2 > i && !r.correctness);
  go(n === -1 ? (rows.findIndex(r => !r.correctness) === -1 ? i : rows.findIndex(r => !r.correctness)) : n);
}

el("prev").onclick = () => go(i - 1);
el("next").onclick = () => go(i + 1);
el("skipto").onclick = nextUnlabelled;
el("note").onchange = e => save({ note: e.target.value });

document.addEventListener("keydown", e => {
  if (e.target.tagName === "TEXTAREA") return;
  const k = e.key.toLowerCase();
  if (k >= "1" && k <= "4") return set("correctness", CORRECTNESS[+k - 1]);
  if ("qwer".includes(k)) return set("fluency", "qwer".indexOf(k) + 1);
  if ("asdf".includes(k)) return set("observedLanguage", ["English","Albanian","mixed","other"]["asdf".indexOf(k)]);
  if (e.key === "ArrowLeft") return go(i - 1);
  if (e.key === "ArrowRight") return go(i + 1);
  if (k === "n") return nextUnlabelled();
});

(async () => {
  rows = await (await fetch("/api/rows")).json();
  chips(el("correctness"), CORRECTNESS);
  chips(el("observedLanguage"), LANGS);
  chips(el("fluency"), [1,2,3,4]);
  const first = rows.findIndex(r => !r.correctness);
  i = first === -1 ? 0 : first;
  render();
})();
</script></body></html>`;

async function main(): Promise<void> {
  const runId = resolveRunId(arg("run-id"));
  const labelsPath = path.join(RUNS_ROOT, runId, "labels.jsonl");
  const port = Number(arg("port") ?? 5174);

  const read = async (): Promise<LabelRow[]> =>
    (await fs.readFile(labelsPath, "utf8"))
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l) as LabelRow);

  // Verify up front rather than on the first request, so a wrong run id is an error in the
  // terminal and not a blank page.
  const initial = await read().catch(() => {
    throw new Error(`No labels file at ${labelsPath}. Run the parse step for this run first.`);
  });

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === "GET" && (req.url === "/" || req.url?.startsWith("/?"))) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(PAGE);
        return;
      }
      if (req.method === "GET" && req.url === "/api/rows") {
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(await read()));
        return;
      }
      if (req.method === "POST" && req.url === "/api/row") {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const { rowId, patch } = JSON.parse(Buffer.concat(chunks).toString()) as {
          rowId: string;
          patch: Partial<LabelRow>;
        };

        // Re-read, patch, rewrite. The whole file is 116 lines, and round-tripping it each time
        // means the page never holds authoritative state — close the tab mid-session and
        // everything already clicked is on disk.
        const rows = await read();
        const row = rows.find((r) => r.rowId === rowId);
        if (!row) {
          res.writeHead(404).end(JSON.stringify({ error: `No row ${rowId}` }));
          return;
        }
        Object.assign(row, patch);
        await fs.writeFile(labelsPath, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");

        const done = rows.filter((r) => r.correctness).length;
        process.stdout.write(`\r  ${done}/${rows.length} labelled   `);
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: true }));
        return;
      }
      res.writeHead(404).end("Not found");
    } catch (err) {
      res.writeHead(500).end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    }
  });

  server.listen(port, () => {
    const done = initial.filter((r) => r.correctness).length;
    console.log(`\nLabelling ${runId}`);
    console.log(`  ${initial.length} questions, ${done} already labelled`);
    console.log(`  file: ${labelsPath}\n`);
    console.log(`  open  http://localhost:${port}\n`);
    console.log(`  Saves on every click. Ctrl-C when done, then: npm run eval:score -- --run-id=${runId}\n`);
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
