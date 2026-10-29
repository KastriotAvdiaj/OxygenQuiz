# The AI eval set — you cannot improve what you have not measured

How generation quality is measured: a frozen set of topics, run through the production prompt
and the production parser, labelled by a human, scored as error rate *and* yield together. How
to run it is [`eval/README.md`](../../eval/README.md); this doc is why it is shaped the way it is.

> **Status: implemented (2026-10-17).** Closes Phase 0 of
> [`../quiz/ai-question-accuracy-plan.md`](../quiz/ai-question-accuracy-plan.md), which required
> it before any later phase could be judged.

---

## The problem it solves

Before this, the only evidence about generated-question quality was complaints. The usage ledger
records `QuestionsRequested` and `QuestionsReturned`, and the second of those counts array
elements the model emitted — not questions that survived `parse-ai-output.ts` — so the one
quality-shaped number in the database is systematically optimistic (plan §0, gap 9.8). Nothing
recorded a human verdict on a generated question anywhere.

That makes every proposed improvement unfalsifiable. Grounding, a verification pass, a better
model: each sounds right, and without a baseline none of them can be shown to have worked.

## Two numbers, never one

The report always prints both:

- **Error rate** — of the questions an author would actually see, how many are wrong.
- **Yield** — of the questions requested, how many survived to be seen.

**Either number alone is trivially gamed by making the product worse.** A pipeline that drops
every question has a 0% error rate and is useless; one that drops nothing has a 100% yield and
is what we have now. Only the pair describes the trade a change actually makes.

Every rate carries a **95% Wilson interval**, not a bare percentage. The sample is ~120
questions and the temptation to over-read it is strong: two errors in fifty is "4%", with an
interval running from roughly 0.5% to 14%. Wilson rather than the normal approximation because
it stays sane at small *n* and near zero, which is exactly where these numbers live. Two runs
whose intervals overlap have not been shown to differ, and the report says so.

## Why a person labels, and not a model

The obvious shortcut is an LLM judge: cheap, instant, scales past 120 questions. It is the wrong
tool for the **baseline** specifically.

A judge drawn from the same family as the generator shares its blind spots — it will confirm the
confident wrong answers that are precisely the failure being measured, and it has no access to
ground truth the generator lacked. Worse, once the judge is the yardstick, every later change
gets tuned to satisfy the judge rather than the player. The baseline is the one measurement that
has to be independent of the thing being measured.

A model-based verifier is still worth building — it is Phase 3 of the accuracy plan, where it
runs **inside** the pipeline, grounded in source text, annotating rather than deciding. That is a
different job from scoring the pipeline from outside.

## Why it reuses the production prompt and the production parser

**The prompt is fetched, never built.** `generate.ts` calls `POST /api/quiz/ai-prompt`, the
endpoint that already exists so the copy-paste path cannot drift from in-app generation
([`../quiz/ai-quiz-two-paths.md`](../quiz/ai-quiz-two-paths.md) §3). A harness carrying its own
copy of the prompt measures the copy — which is worse than measuring nothing, because the number
looks real. `fetchPrompt` asserts the reply is long enough and contains the word `json`, so a
future shortcut fails loudly instead of quietly.

**The parser is imported, not reimplemented.** `parseAiOutput` decides what an author actually
sees, so scoring the model's raw JSON would score something no user is ever shown — and would
report a yield of 100% by construction. This is also why the harness is TypeScript rather than a
C# console project: generation lives in C# and the deciding layer lives in the browser, and a
measurement that skips the deciding layer is not measuring the pipeline.

**What it does bypass is `ai-generate`.** Quota reservation, the usage ledger, the audit write and
the HTTP error mapping do not change the questions that come back. Going around them means a
12-topic run costs no quota slots and leaves no rows behind, and the two components that decide
quality are still the production ones.

## Why labelling is blind

Rows are shuffled, carry an opaque hash id, and say nothing about which topic, run or language
mode produced them. The mapping lives in `key.json`, which only the scorer reads.

This is not ceremony. The expected use is labelling a before-run and an after-run of a change you
built and believe in, and knowing which is which while labelling is how a 2% improvement gets
found in noise. The cost is one extra file; the alternative is a number nobody should trust,
including you.

## Why the harness runs at temperature 0 and production stays at 0.3

Variety is a feature in production: two authors generating "Photosynthesis" should not get the
same five questions. Variety is noise in a measurement — at 0.3 a re-run of an unchanged pipeline
moves the error rate on its own, and that movement is indistinguishable from the effect of a
change. The harness sends `temperature: 0` and a fixed `seed`; vendors honour the seed
best-effort, which is better than not asking. Neither value touches `Ai:Temperature`.

## The language mode flag, and the gap it exists to measure

There is no language picker on the generate form — `advanced-options.tsx` offers question count,
question types and extra instructions, nothing else. So `LanguageName` is never sent, the prompt
always takes the `askForLanguage` branch, and **the model infers the quiz's language from the
topic string**. Nothing downstream verifies the questions came back in that language.

`--language-mode=inferred` (the default) reproduces that. `--language-mode=pinned` sends the
language. Running both and comparing the per-language rows of the report is how the cost of the
missing picker gets a number instead of an opinion — which is the point of having the harness
before the fix rather than after.

## Grounded runs, and the comparison that can show them working

`--grounding` builds every prompt the way a grounded generation would (`ground: true` on
`ai-prompt`; the API must run with `Ai__Source__Enabled=true`, and the run refuses to start
otherwise). When the server asks a question, the run answers as an author would: the topic's
`language` for "English or Albanian?", and for "which article?" the topic's `sourceTitle`,
"none of these" when `noSource` is set, or the first offer — marked *(auto)* in the report so
`topics.json` can be fixed. The article text is saved with the reply, so `parse` runs the quote
check exactly as the app does for Source mode.

The report gains a grounding table — what each topic was written from, and what was asked. With
`--compare`, it also gives **the grounded topics only, in both runs**. That cut is the one that can
show grounding working: topics Wikipedia has no article for are written from memory in a
grounded run too, and on the Phase 0 set they held 11 of the 23 wrong answers — enough that the
whole-run rate could not clear the "intervals don't overlap" bar even if grounding fixed every
error it touched.

```bash
# API: Ai__Source__Enabled=true
npm run eval:generate -- --grounding
npm run eval:parse
npm run eval:label
npm run eval:score -- --compare=2026-10-28T23-41-01-324Z-inferred
```

## What it deliberately does not do

- **No automated correctness check.** There is none to have; that is the whole premise.
- **No per-question regeneration or repair.** The harness measures; it does not improve.
- **No CI integration.** Every run costs model calls and a human afternoon. Run it when a change
  to the generation path is worth measuring, not on every push.
- **No Source mode yet.** `/ai/material` is unrouted, so Topic mode is the only mode users reach
  and the quote check has nothing to compare against. When Source mode ships, `topics.json` gains
  a `sourceText` field and `contextFor` stops passing `sourceText: null`.
