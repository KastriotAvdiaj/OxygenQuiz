# Plan: Accurate AI Question Generation

Status: **Phases 1 and 1b implemented** (deterministic checks, prompt hardening, question
explanations). Phases 2–5 proposed.
Transient plan doc — fold what ships into [`ai-quiz-generation-flow.md`](./ai-quiz-generation-flow.md)
and [`ai-quiz-architecture.md`](./ai-quiz-architecture.md), then delete this file.
Last updated: 2026-09-26

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

### Phase 0 — Eval set (before anything else is judged)

- ~200 questions across 20 topics, current setup, labelled correct / wrong / ambiguous /
  time-sensitive. 50 is too few: 2 errors in 50 is "4%" with a 95% interval of roughly 0.5–14%.
- Label without knowing which pipeline produced a question.
- Store under `eval/` with a script that runs the pipeline against the topic list and prints, per
  stage, how many were dropped and why — plus **yield** (kept ÷ requested).
- Close gap §9.8 of the flow doc while here: `QuestionsReturned` counts array elements, not
  survivors, so the ledger's quality metric is optimistic.

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

- **2a.** Register `/ai/material` — Source mode already works server-side. Cheapest grounded path.
- **2b.** `WikipediaSourceProvider` for Topic mode. Search API → first non-disambiguation hit →
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
- Same call returns flags per question: `multipleDefensible`, `notSupported`, `timeSensitive`.
  Critic and answerer are one call, not two.
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

- Language: grounded Albanian quizzes depend on sq.wikipedia coverage — measure in Phase 0 before
  promising it.
- Should a grounded generation cost the same quota slot as today? It is up to two calls instead of
  one.
- Is a "no article found" fallback to ungrounded generation acceptable, or should Topic mode
  refuse and point at the material path?
