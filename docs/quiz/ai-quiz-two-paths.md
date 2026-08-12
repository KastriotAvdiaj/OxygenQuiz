# Creating a quiz with AI: two paths, one pipeline

How "generate it for me" and "use your own AI" relate, why they are two routes rather than
one screen with a disclosure, and what has to stay identical between them.

Last updated: 2026-08-12. Companion to
[`ai-quiz-architecture.md`](./ai-quiz-architecture.md) (the *how* of the whole feature) and
[`ai-quiz-generation-flow.md`](./ai-quiz-generation-flow.md) (the in-app generation contract).

---

## 1. The two paths

| | **Generate for me** | **Use your own AI** |
|---|---|---|
| Route (admin) | `/dashboard/quizzes/create-quiz/ai` | `/dashboard/quizzes/create-quiz/ai/own` |
| Route (user) | `/my-dashboard/quizzes/create/ai` | `/my-dashboard/quizzes/create/ai/own` |
| Container | `ai-quiz-wizard.tsx` | `own-ai-quiz.tsx` |
| View | `ai-quiz-wizard-view.tsx` | `own-ai-quiz-view.tsx` |
| Who runs the model | We do, on our budget | The user's ChatGPT / Claude / Gemini |
| Costs | A daily generation from their quota | Nothing |
| The middle step | One Generate button | Copy prompt → leave → paste reply |
| Input | Topic **or** source material | Topic only (see below) |
| Owns | The generate mutation, quota, `AiGenerateError` | The clipboard, the pasted reply |

Everything else — the entity lookups, "what should this quiz be about?", the Advanced drawer,
resolving the model's category/language names into ids, the parser, the confirm-details card,
the review handoff into the prefilled builder — is **the same code**, and lives in
`use-ai-quiz-draft.tsx`.

## 2. Why two routes

The own-AI path has been three things, and the first two were the same mistake in different
clothing:

1. **An inline disclosure** inside the wizard. Expanded, it was two numbered steps, a 140px
   code textarea and a possible error list — taller than the card it hung off, so opening it
   pushed Generate off the screen and rearranged the page under the user's thumb.
2. **A drawer** over the wizard. Fixed the height problem by covering the page it belonged to,
   which is worse: a modal you have to leave the app from, sitting on top of the flow you
   didn't choose.
3. **A page.** Which is what it always was — a round trip through another application. You
   describe the quiz, copy, leave, come back with a blob of JSON, paste. That is not a detail
   of the generate flow; it is a flow, and flows get URLs.

The practical wins: the browser Back button means something, the state is scoped to the
attempt rather than lingering behind a collapsed disclosure, and neither screen has to render
the other's controls.

**How the user gets there.** One quiet grey link at the bottom of the wizard, directly above
"Create manually instead" — the two ways out of the generate path, both understated. There is
deliberately no second, louder entrance: when in-app generation is unavailable (kill switch,
quota spent, unverified email) the Generate button goes **disabled** rather than disappearing,
and this link stays exactly where it always is. Two buttons to the same page, one of them
promoted only sometimes, made the card look like it was offering two different things.

## 3. What must stay the same, and what enforces it

- **One prompt.** Both paths call `buildInput()` in the shared hook. `POST /quiz/ai-generate`
  takes it as a body; `POST /quiz/ai-prompt` turns the same input into the text you paste
  elsewhere, and the text itself is built in `AiPromptBuilder.cs`. There is no second prompt
  in the codebase to drift (generation plan §5.1) — and *this is the property the split most
  endangers*, so it is worth re-checking whenever either path changes.
- **One parser, one handoff.** Both set `payload` on the hook; everything after that —
  `extractQuizSuggestions`, name→id resolution, `parseAiOutput`, `needsConfirmation`, the
  `builderSlot` with `aiImportMode` — happens in one place and cannot diverge.
- **One set of Advanced options.** `advanced-options.tsx` is rendered by both views with the
  same props.
- **Except the mode tabs, which only the generate path has.** "From my material" means *we*
  put the material in the request and truncate it server-side at `Ai:MaxSourceChars`. Through
  someone else's chat window we can't: the user pastes their notes there themselves, at
  whatever length that tool accepts. Offering the tab on the own-AI page would promise a
  handoff we don't perform, so that page is topic-only and its `mode` never leaves `"Topic"`.
- **The same validation bar.** "Enough to build a prompt from" is `topic.trim()` non-empty, or
  40+ characters of source material, plus at least one question type. Each view has its own
  copy of that guard because each wraps a different button — if you change one, change both.
  (A shared guard would have to know which button it is guarding, which is more coupling than
  the duplication costs.)

## 4. State does not travel between them

Navigating from the wizard to the own-AI page starts a fresh draft: no topic, no Advanced
overrides. This is deliberate. They are two attempts at the same job, and silently carrying a
half-filled form across a route change is a surprise — the user is looking at fields they
did not fill in on this screen. If we ever want continuity, it should be explicit (a query
param, a "keep what I typed" affordance), not an accident of shared state.

## 5. Where things live

```
AI-Quiz/
  use-ai-quiz-draft.tsx        ← everything both paths share
  ai-quiz-wizard.tsx           ← generate: mutation + quota
  ai-quiz-wizard-view.tsx      ← generate: markup
  own-ai-quiz.tsx              ← own AI: clipboard + pasted reply
  own-ai-quiz-view.tsx         ← own AI: markup
  parse-ai-output.ts           ← shared: reply → questions
  prompt.ts                    ← shared: numeric limits + defaults
  components/                  ← shared blocks, both views render them
  __fixtures__/                ← shared story fixtures (lookups, failing replies)
```

Both views are prop-driven and storied (`*.stories.tsx`), so every screen — including the
failures you cannot reproduce on demand — is reachable without a backend or an LLM. See
[../development/storybook.md](../development/storybook.md).

## 6. Adding a third path

If a "generate from a file" path ever lands, it belongs here as a fourth column, not as a
mode inside one of these. The test is the one this document is named for: does the new thing
change **who runs the model or how the reply arrives**? Then it is a path — give it a route,
put its own step in its own container, and let `use-ai-quiz-draft` handle the rest. Does it
only change **what we ask the model for**? Then it is an option on the existing request, and
it belongs in the Advanced drawer.
