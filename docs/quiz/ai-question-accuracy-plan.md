# Plan: Accurate AI Question Generation

Status: **Phases 0, 1 and 1b implemented** (eval harness, deterministic checks, prompt hardening,
question explanations), the **baseline is measured** (Phase 0, below), and **2a is built but
closed** on the current model. The rest of Phase 2, and 3–5, proposed.
Transient plan doc — fold what ships into [`ai-quiz-generation-flow.md`](./ai-quiz-generation-flow.md)
and [`ai-quiz-architecture.md`](./ai-quiz-architecture.md), then delete this file.
Last updated: 2026-10-29

---

## Problem

Generated questions contain factual mistakes, and the only thing between a mistake and a player
is the author's review in the builder — which people skim. The model writes from memory (Topic
mode is the only mode users can reach today), and nothing but the parser's *shape* checks runs
before the author sees the questions.

What is **not** the problem: AI output does not go "straight into the question bank". It lands
unsaved in the builder, questions are `Private`, and saving goes through the atomic `ai-import`
(architecture §5, invariants 4 and 6). The fix is to put more checks in front of that review, not
to add a review.

## Goal

Every generated question is a proposal that passes independent checks before the author sees it
(ADR 0003, *the model proposes, the code decides*). Measured by **error rate and yield together**
on a fixed labelled set (Phase 0) — a pipeline that rejects everything has a 0% error rate.

---

## Constraints the pipeline has to respect

These come from code and decisions that already exist. The first draft of this plan missed them.

1. **Two paths, one parser.** Generate-for-me and use-your-own-AI converge on one `payload`
   string and one parser (`ai-quiz-two-paths.md`). Anything that drops a question must live in
   `parse-ai-output.ts` or the paths diverge — which has already happened once
   (`ai-quiz-generation-flow.md` §3b). Model-based verification can only run on the generate path
   (it costs our quota), so it **annotates**; the parser still decides.
2. **Three question types, not one.** MultipleChoice (2–4 options, several may be correct),
   TrueFalse, TypeTheAnswer. A `{options[4], correctIndex}` schema would break the existing
   payload contract, the own-AI path and every stored prompt. New fields are **optional
   additions** to the current schema (`sourceQuote` is the first).
3. **The vendor layer already exists.** `IQuizAiProvider` + the `Ai:Vendors` catalogue is
   vendor-neutral, and Gemini exposes an OpenAI-compatible endpoint — so "add Gemini" is a
   catalogue entry, not a `GeminiClient`. What is missing is **per-role selection**
   (`Ai:Roles:Generator` / `Ai:Roles:Verifier` naming catalogue entries). No `ILlmClient`.
4. **The ledger already exists.** `AiGenerationUsage` is one row per attempt with model, tokens,
   cost and status. Verification calls add their tokens to the **same row**, so the daily and
   monthly budget caps see them. No `GenerationRun` table.
5. **Limits are tight.** Default daily quota is 2, Groq free tier ~250 req/day and 8k TPM,
   `MaxOutputTokens` 4000, generation 10–40 s under a 100 s Cloudflare proxy timeout. Anything
   per-question is out; calls are **per batch**, and a second sequential call needs its own
   request (see Phase 3).
6. **Source mode exists but isn't routed.** `/ai/material` shows as "Soon". Until it ships or
   Topic mode gets a source, grounding checks reach nobody.

---

## Pipeline

```
Topic ──► 2. Source (Wikipedia) ─┐            (Source mode: the user's material)
                                 ▼
                     Generate  — one call, grounded prompt, sourceQuote per question
                                 │
                                 ▼   server returns payload + sourceText + sourceUrl
                     3. Verify — generate path only: one batched call, second vendor role,
                                 │  answers from the source WITHOUT the key → annotations
                                 ▼
             parse-ai-output.ts — shape + question-checks.ts + annotations → keep / drop / flag
                                 │   (both paths)
                                 ▼
                     Review in builder — "Check this" badges, source link, drop report
```

---

## Phases

### Phase 0 — Eval set (before anything else is judged) ✅ implemented

Built as `eval/`; how it works and why, in
[`../development/ai-eval.md`](../development/ai-eval.md). It came in at 12 topics × 10 questions
rather than 20 × 10 — the sample-size argument below is right, and 200 hand-labelled items is
also how the harness never gets used once. Widen `topics.json` when a run proves worth repeating.
Two things the plan did not anticipate: the run is **blind** (shuffled rows, the key in a separate
file), and it carries a `--language-mode` flag, because there is no language picker on the
generate form and the model currently infers the language from the topic string. The baseline
settled that: 0 of 116 questions came back in the wrong language, so **the picker is not
needed — do not build it** on accuracy grounds.

Against the original list:

- **Done** — blind labelling; `eval/` with a script that runs the topic list and prints, per
  stage, how many were dropped and why, plus **yield** (kept ÷ requested); every rate carries a
  95% Wilson interval, because the sample-size worry below is real.
- **Reduced** — 12 topics × 10 questions (120), not 20 × 10 (200). Widen `topics.json` once a
  run has proved worth repeating.
- **Still open** — gap §9.8 of the flow doc. The harness now reports *returned* and *kept*
  separately, so a run shows the difference; the `QuestionsReturned` **column** still counts
  array elements, so the ledger's own quality metric remains optimistic. Fixing it is a
  backend change the harness does not need.
- **Done** — baseline run and hand-labelled, 2026-10-29. Below.

#### Baseline (2026-10-29)

Run `2026-10-28T23-41-01-324Z-inferred`: `openai/gpt-oss-120b` on Groq, reasoning effort low,
temperature 0, seed 20261017, language mode **inferred** (what production does), 116 of 116 kept
questions labelled. The full report lives in `eval/runs/<id>/report.md`, which is gitignored —
these numbers are the copy that survives.

| measure | value |
|---|---|
| yield | 116 / 120 requested (122 returned; the parser dropped 6) |
| parser drops | all 6 for one rule (answer given away in the question); **none** of the 46 defects |
| wrong | 19.8% (23/116, 95% CI 13.6–28.0%) |
| ambiguous | 19.8% (23/116, 95% CI 13.6–28.0%) |
| time-sensitive | 0% (0/116) |
| **defective** (wrong + ambiguous) | **39.7%** (46/116) |
| wrong language | 0 / 116 |

| language | kept | wrong | mean fluency (1–4) |
|---|---:|---:|---:|
| Albanian | 57 | 14 (24.6%) | 3.12 |
| English | 59 | 9 (15.3%) | 3.97 |

| type | labelled | wrong |
|---|---:|---:|
| MultipleChoice | 50 | 26.0% (95% CI 15.9–39.6%) |
| TrueFalse | 39 | 15.4% (95% CI 7.2–29.7%) |
| TypeTheAnswer | 27 | 14.8% (95% CI 5.9–32.5%) |

| topic | labelled | wrong | ambiguous | defective |
|---|---:|---:|---:|---:|
| sq-03 Rilindja literature | 11 | 4 | 6 | **90.9%** |
| en-05 C# 12 / .NET 8 | 9 | 5 | 2 | **77.8%** |
| en-06 2024 Olympics | 10 | 3 | 2 | 50.0% |
| sq-05 football rules | 10 | 2 | 3 | 50.0% |
| sq-01 Kosovo, 20th c. | 8 | 4 | 0 | 50.0% |
| sq-04 Albanian cuisine | 8 | 2 | 2 | 50.0% |
| sq-02 geography | 10 | 2 | 2 | 40.0% |
| en-03 WWII in the Balkans | 10 | 0 | 3 | 30.0% |
| en-01 photosynthesis | 10 | 0 | 2 | 20.0% |
| en-04 Mercury | 10 | 1 | 0 | 10.0% |
| sq-06 Python basics | 10 | 0 | 1 | 10.0% |
| en-02 respiratory system | 10 | 0 | 0 | 0.0% |

What it says:

- **Errors concentrate by subject**, which is what a knowledge gap looks like. That is the case
  for Phase 2. English errors are 5 in en-05 (staleness), 3 in en-06 (recency) and 1 in en-04;
  en-01/02/03 have none.
- **en-05 is a staleness failure that Wikipedia will not fix.** Its five wrong answers misdate
  C# features (C# 10/11 features keyed as C# 12) or invent APIs. The topic note already says
  official docs are the source here; Phase 2b alone will not move this row.
- **The Mercury ambiguity trap did not fire.** All ten questions picked the planet; the one error
  is arithmetic (a 3:2 resonance keyed as "3"), so en-04 measured nothing about disambiguation.
- **Explanations are unreliable even when the key is right.** In three rows the explanation
  argues for a different answer than the key (`b3a1c913ff`, `1814680e2f`, `aa27ca3364`); in
  others the key is right and the explanation states something false (`e777dea758`,
  `e1604a1051`, `064d463ee1`). Players read the explanation, so this needs checking; see Phase 3.
- **MultipleChoice is the weak type**, and partly because of fabricated distractors: nonsense
  words such as "Marrëzë", "Kokërr" and "Petëqengë" are both wrong Albanian and make the question
  trivial (`6fb5b3f6b8`, `67a1d0d103`). Albanian fluency (3.12) is also clearly below English
  (3.97); many "correct" Albanian rows carry grammar notes.

**What a change has to beat.** By the harness's own rule, a difference is shown only when the
intervals do not overlap: the after-run's *upper* bound has to fall below this run's lower bound
of 13.6%. At ~116 labelled questions that means **at most 8 wrong (≈6.9%, CI 3.5–13.0%)**, with
yield reported next to it. A wrong rate of, say, 12% would be an encouraging sign, not a result.

**Changes since the baseline that the next run will also measure** — list them here so an
after-run is not credited to one change when it carries several:

- 2026-10-29: the quality rule asks for real, correctly spelled distractors of the same kind as
  the answer (`AiPromptBuilder`). Too small to measure alone (about 2 affected rows of 116).
- 2026-10-29: Source mode (Phase 2a) exists but cannot affect a Topic-mode run — the eval only
  runs topics, and the mode is closed on the baseline's model.

### Phase 1 — Deterministic checks ✅ implemented

No model calls, no schema change, both paths.

- `question-checks.ts` (pure, unit-tested) wired into `parseAiOutput`. Drops, with a reason shown
  by `ImportNotices`: duplicate options; `allowMultipleSelections: false` with several correct;
  the answer written in the question text (unless every option is); a repeated question; a
  `sourceQuote` that isn't in the source.
- `AiPromptBuilder`: one quality rule in both modes (unambiguous key, distinct options, no
  giveaway, no NOT/EXCEPT or all/none-of-the-above); in Source mode a `sourceQuote` field, copied
  verbatim **in the source's language** even when the questions are in another.
- A **missing** quote is tolerated; only a present-but-wrong one drops. Tighten once Phase 0 shows
  how often models omit it.

### Phase 1b — Explanations ✅ implemented

A nullable `Explanation` on every question, shown to the player after answering. Not an AI feature —
hand-written questions get it too — but the prompt asks for one on every generated question, and
making a weak model justify its key is itself a cheap accuracy aid. How it works:
[`question-explanations.md`](./question-explanations.md). Shipped with it, because the explanation
states the answer: the session DTO no longer carries the answer key mid-quiz
([`quiz-grading.md`](./quiz-grading.md), "What the session response reveals, and when").

### Phase 2 — Grounding

- **2a. ✅ Built 2026-10-29, closed on the current model.** `/ai/material` takes pasted text or
  an uploaded PDF, Word or text file; questions are written in the material's language, English
  or Albanian only. Opens when a vendor entry sets `AllowsSourceMode` — not `groq`, which the
  baseline above rules out. How it works: [`ai-quiz-generation-flow.md`](./ai-quiz-generation-flow.md)
  §2d; why: [ADR 0026](../adr/0026-source-mode-writes-in-the-materials-language-and-opens-per-model.md).
  Measure it before opening it (flow doc §9.16).
- **2b. Server and eval built 2026-10-29, switched off** — flow doc §2e. Language and article
  are chosen as [the source-tiers proposal](../proposals/topic-disambiguation-and-source-tiers.md)
  says, except that the article is matched by title (the "first hit" below picked the wrong one on
  seven of the twelve eval topics). Next: an eval run with `--grounding`, compared on the grounded
  topics; then the wizard UI. The original sketch, for the record:
  `WikipediaSourceProvider` for Topic mode. Search API → first non-disambiguation hit →
  plain-text extract, from `sq.wikipedia.org` when the quiz language is Albanian, falling back to
  English. The server then builds the **Source-mode** prompt from it.
- The generate response gains `sourceText` (what the model saw, after truncation) and
  `sourceUrl`/`sourceTitle`, so the shared parser can run the quote check and the review step can
  show *which article* was used — the likeliest silent failure is the wrong "Mercury".
  Attribution for CC BY-SA content comes free with the link.
- No article found → today's Topic prompt, and the review says the questions are ungrounded.
- Cache extracts by (language, title) in `IMemoryCache`.

### Phase 3 — Verification (generate path)

- **Grounded blind answer, not recall.** The verifier gets the source text and the questions with
  options **shuffled** and **no key**, and answers each one. A weak model is far better at reading
  comprehension than recall, so this doesn't reject hard-but-correct questions the way a
  memory-only verifier does — which would quietly skew every quiz toward easy.
- Same call returns flags per question: `multipleDefensible`, `notSupported`, `timeSensitive`,
  `explanationContradictsKey`, `implausibleDistractor`.
  Critic and answerer are one call, not two.
- **Explanation–key consistency**, in the same call: does the explanation support the keyed
  answer, and is it supported by the source? The baseline has explanations that argue for another
  answer, and false explanations under a correct key (Phase 0). Contradiction → drop, like a
  disagreement; an unsupported explanation → **Check this**.
- **Implausible distractors** (MultipleChoice): a flag for options that are not real words or not
  members of the asked-for category — the baseline's fabricated Albanian distractors. Flag only.
- Disagreement with the key → drop. A flag alone → keep with **Check this**.
- TrueFalse: agreement is 50% by chance, so for this type only a *disagreement* counts. 
  TypeTheAnswer: compare with the existing `TypeTheAnswerMatcher`, not string equality.
- A different vendor role when one is configured; otherwise the same model at temperature 0 is
  still useful for grounded answering.
- Runs as a **second request** (`POST /quiz/ai-verify`) the client fires after generation, with
  questions shown as "checking…" — two sequential calls in one request would crowd the 100 s proxy
  timeout. Tokens are added to the generation's usage row; no second quota slot.

### Phase 4 — Review UI

- Badges and the source link live in **draft state only**. A persisted `Confidence = Verified`
  goes stale the moment the author edits the question, and nothing downstream needs it — so no
  `Question` columns and no migration in this phase.
- Publishing with **Check this** questions left asks once; it doesn't block.
- Per-question regenerate is a separate feature with its own quota question; not in this plan.

### Phase 5 — Player reports

The last net: whatever gets past the checks and the author, a player can flag. Applies to
hand-written questions too, so it doesn't wait for Phases 2–4.

**v1 — report, notify, list. No auto-hide.**

- A **Report** button on each answer in the post-quiz review (`question-review.tsx`) — the one
  place a player has both the question and the answer key in front of them, so a report can say
  *what* is wrong. Not during play: a player mid-question can't tell a wrong key from their own
  mistake, and a report button next to the timer invites rage-clicks.
- A reason from a short list — *wrong answer*, *more than one right answer*, *out of date*,
  *unclear*, *other* — plus optional text. The explanation, when there is one, is what a player
  argues with: "the explanation says X, but…" is the most useful report there is.
- New `QuestionReport` row: `QuestionId`, `ReporterUserId`, `SessionId`, `Reason`, `Note`,
  `CreatedAt`, `ResolvedAt`/`ResolvedBy`. One open report per player per question (unique index),
  so a single player can't stack reports.
- Only a player who **answered** the question in a **completed** session may report it — checked
  server-side against `UserAnswers`. That's what stops brigading without a threshold: every report
  costs a real play.
- The quiz's author is notified through the existing notification system, and sees open reports
  on their question in the dashboard. Admins get a list of questions by open-report count.
- Resolving is editing the question (or dismissing the report); resolving closes all open reports
  on it.

**Deliberately not in v1:** auto-hiding after N reports. Hiding a question mid-flight changes the
question count of sessions in progress, of multiplayer lobbies that have already loaded the quiz,
and of the scoring denominators — and a flat N rewards coordinated reporting. Revisit with real
report volumes, and if it comes, hide from *new* sessions only, with a threshold relative to plays.

### Out of scope (own plans)

- **Cross-quiz dedupe.** AI questions are `Private`; deduping against other users' questions
  gains nothing. Within-batch is done (Phase 1); within the author's own quizzes can follow.
- **Associations format.** Not a question type the app has.

---

## Documentation owed

- **ADR 0017** (0004 and 0016 are taken) when Phase 2/3 land: grounding before generation, verification
  that annotates while the shared parser decides, and why the verifier reads the source instead of
  answering from memory.
- Pipeline behaviour goes into `ai-quiz-generation-flow.md` (the living doc), not a new
  `entities/` file.

## Open questions

- ~~Language: grounded Albanian quizzes depend on sq.wikipedia coverage — measure in Phase 0~~
  **Partly answered (2026-10-28).** sq.wikipedia holds 106,477 articles and the coverage is
  uneven: `Rilindja Kombëtare Shqiptare` is 6,157 words, `Historia e Kosovës` is **276**. A
  stub that short is worse than no source — it looks grounded and cannot carry ten questions.
  So Wikipedia alone is not enough for Albanian, and Phase 2b's source rule does not survive
  contact with the search index either. See
  [`../proposals/topic-disambiguation-and-source-tiers.md`](../proposals/topic-disambiguation-and-source-tiers.md).
  Question quality is now measured too (Phase 0 baseline): Albanian is 24.6% wrong against
  English's 15.3%, and fluency 3.12 against 3.97.
- Should a grounded generation cost the same quota slot as today? It is up to two calls instead of
  one.
- Is a "no article found" fallback to ungrounded generation acceptable, or should Topic mode
  refuse and point at the material path?
